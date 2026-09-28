import { SchematicBillingClient, fetchBillingData } from "./client";
import { checkoutProblemsOf } from "./contract";
import {
  fakeFetch,
  tokens,
  wireCatalogView,
  wireCheckout,
  wireCheckoutResult,
} from "./testing";
import { SchematicApiError, SchematicSession } from "./session";

const wireInvoices = {
  data: {
    count: 1,
    invoices: [
      {
        id: "inv_1",
        amount_due: 100,
        currency: "usd",
        status: "paid",
        due_date: "2026-08-01T00:00:00Z",
        created_at: "2026-07-31T00:00:00Z",
        url: null,
      },
    ],
  },
};

/** An empty page in the shape the API sends one. */
const wireEmpty = { data: { count: 0, invoices: [] } };

const wireUpcoming = {
  data: {
    amount_due: 6800,
    currency: "usd",
    customer_balance_applied: 1500,
    customer_balance_remaining: 0,
    discounts: [
      {
        amount_off: null,
        coupon_name: "Launch",
        currency: null,
        customer_facing_code: "LAUNCH20",
        duration: "repeating",
        duration_in_months: 3,
        percent_off: 20,
      },
    ],
    due_date: "2026-09-30T00:00:00Z",
    subtotal: 8300,
  },
  params: {},
};

const wirePaymentMethods = {
  data: {
    count: 2,
    payment_methods: [
      {
        id: "pm_sch_1",
        external_id: "pm_stripe_1",
        type: "card",
        is_default: true,
        can_remove: false,
        card_brand: "visa",
        card_last4: "4242",
        card_exp_month: 12,
        card_exp_year: 2030,
        bank_name: null,
        account_last4: null,
        account_name: null,
        billing_name: "Ada",
        billing_email: "ada@example.com",
      },
      {
        id: "pm_sch_2",
        external_id: "ba_stripe_2",
        type: "us_bank_account",
        is_default: false,
        can_remove: true,
        card_brand: null,
        card_last4: null,
        card_exp_month: null,
        card_exp_year: null,
        bank_name: "First Bank",
        account_last4: "6789",
        account_name: "Checking",
        billing_name: null,
        billing_email: null,
      },
    ],
  },
  params: {},
};

const wireSetupIntent = {
  data: {
    account_id: "acct_1",
    publishable_key: "pk_test_1",
    schematic_publishable_key: "api_1",
    setup_intent_client_secret: "seti_1_secret",
  },
  params: {},
};

/** What each path answers, so one fake can serve a whole prefetch. */
const byPath =
  (routes: Record<string, { status?: number; body?: unknown }>) =>
  (url: string) => {
    const path = new URL(url).pathname;
    return routes[path] ?? { status: 404, body: { error: "not found" } };
  };

describe("SchematicBillingClient", () => {
  it("passes paging params and decodes invoice rows", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const page = await client.fetchInvoices({ limit: 13, offset: 12 });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/invoices?limit=13&offset=12",
    );
    expect(calls[0].headers["X-Schematic-Api-Key"]).toBe("t");
    expect(page.count).toBe(1);
    expect(page.invoices[0].dueDate).toBeInstanceOf(Date);
    // The generated FromJSON maps wire nulls to undefined optionals.
    expect(page.invoices[0].amountDue).toBe(100);
    expect(page.invoices[0].url).toBeUndefined();
  });

  it("passes include_pending only when set", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireInvoices }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 1, offset: 0, includePending: true });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/invoices?limit=1&offset=0&include_pending=true",
    );
  });

  it("reads no invoices from a null page or a null row array", async () => {
    // The API sends `[]` for an empty history, but a null from anywhere in
    // the chain reads as no invoices rather than throwing in the decoder.
    for (const body of [
      { data: null },
      { data: { count: 0, invoices: null } },
    ]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(
        client.fetchInvoices({ limit: 1, offset: 0 }),
      ).resolves.toEqual({ invoices: [], count: 0 });
    }
  });

  it("never asks for a page larger than the API serves", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await client.fetchInvoices({ limit: 4000, offset: 0 });
    expect(calls[0].url).toContain("limit=250");
  });

  it("reports a malformed body rather than throwing a TypeError", async () => {
    const { fetchImpl } = fakeFetch(() => ({ body: null }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(client.fetchInvoices({ limit: 1, offset: 0 })).rejects.toThrow(
      /Malformed response/,
    );
  });

  it("throws SchematicApiError with the body for other failures", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 500, body: "oops" }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client
      .fetchInvoices({ limit: 1, offset: 0 })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({
      status: 500,
      body: "oops",
      path: "/company/invoices?limit=1&offset=0",
    });
  });

  it("decodes the next bill", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireUpcoming }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const bill = await client.fetchUpcomingInvoice();
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/upcoming-invoice",
    );
    expect(bill).toMatchObject({
      amountDue: 6800,
      customerBalanceApplied: 1500,
      subtotal: 8300,
    });
    expect(bill?.dueDate).toBeInstanceOf(Date);
    expect(bill?.discounts[0]).toMatchObject({
      couponName: "Launch",
      customerFacingCode: "LAUNCH20",
      percentOff: 20,
      durationInMonths: 3,
    });
    // The generated FromJSON maps wire nulls to undefined optionals.
    expect(bill?.discounts[0].amountOff).toBeUndefined();
  });

  it("reads a 204 as no next bill rather than a failure", async () => {
    // No subscription is a 204 from the endpoint: nothing to bill, loaded.
    const { fetchImpl } = fakeFetch(() => ({ status: 204, body: null }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(client.fetchUpcomingInvoice()).resolves.toBeNull();
  });

  it("keeps a 404 as the failure it is", async () => {
    // An account not on the flag: "not available", never "nothing to bill".
    const { fetchImpl } = fakeFetch(() => ({
      status: 404,
      body: { error: "not found" },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client.fetchUpcomingInvoice().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({ status: 404 });
  });

  it("reports a malformed next bill rather than reading it as none", async () => {
    // A 200 with no body, or a body of the wrong shape, is not an answer:
    // read as `null` it would seed "nothing to bill" that nothing refetches.
    for (const body of [null, "yes", { nope: 1 }]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(client.fetchUpcomingInvoice()).rejects.toThrow(
        /Malformed response/,
      );
    }
  });

  it("throws SchematicApiError when the next bill cannot be read", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 500, body: "oops" }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client.fetchUpcomingInvoice().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({
      status: 500,
      path: "/company/upcoming-invoice",
    });
  });

  it("decodes the payment methods", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      body: wirePaymentMethods,
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const methods = await client.fetchPaymentMethods();
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/company/payment-methods",
      method: "GET",
    });
    expect(methods).toHaveLength(2);
    expect(methods[0]).toMatchObject({
      id: "pm_sch_1",
      externalId: "pm_stripe_1",
      type: "card",
      isDefault: true,
      canRemove: false,
      cardBrand: "visa",
      cardLast4: "4242",
      cardExpMonth: 12,
      cardExpYear: 2030,
      billingEmail: "ada@example.com",
    });
    expect(methods[1]).toMatchObject({
      isDefault: false,
      canRemove: true,
      bankName: "First Bank",
      accountLast4: "6789",
    });
    // The generated FromJSON maps wire nulls to undefined optionals.
    expect(methods[0].bankName).toBeUndefined();
    expect(methods[1].cardBrand).toBeUndefined();
  });

  it("reads no methods from an empty, null or omitted list", async () => {
    // The API sends `[]` for a company with nothing on file, but a null
    // from anywhere in the chain reads as no methods rather than throwing
    // in the decoder.
    for (const body of [
      { data: { count: 0, payment_methods: [] } },
      { data: { count: 0, payment_methods: null } },
      { data: { count: 0 } },
      { data: null },
    ]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(client.fetchPaymentMethods()).resolves.toEqual([]);
    }
  });

  it("reports malformed payment methods rather than reading them as none", async () => {
    for (const body of [null, "yes", { nope: 1 }]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(client.fetchPaymentMethods()).rejects.toThrow(
        /Malformed response/,
      );
    }
  });

  it("keeps a 404 on the payment methods the failure it is", async () => {
    // Off the flag, or a customer the provider no longer knows: "not
    // available", never "nothing on file".
    const { fetchImpl } = fakeFetch(() => ({
      status: 404,
      body: { error: "not found" },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client.fetchPaymentMethods().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({
      status: 404,
      path: "/company/payment-methods",
    });
  });

  it("creates a setup intent and decodes it", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      status: 201,
      body: wireSetupIntent,
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const intent = await client.createSetupIntent();
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/components/setup-intent",
      method: "POST",
      body: undefined,
    });
    expect(intent).toEqual({
      accountId: "acct_1",
      publishableKey: "pk_test_1",
      schematicPublishableKey: "api_1",
      setupIntentClientSecret: "seti_1_secret",
    });
  });

  it("reports a malformed setup intent", async () => {
    const { fetchImpl } = fakeFetch(() => ({ status: 201, body: { nope: 1 } }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(client.createSetupIntent()).rejects.toThrow(
      /Malformed response/,
    );
  });

  it("makes a method the default by the provider's id", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      status: 201,
      body: { data: { id: "pm_stripe_1" }, params: {} },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(
      client.updatePaymentMethod("pm_stripe_1"),
    ).resolves.toBeUndefined();
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/checkout/paymentmethod/update",
      method: "POST",
      body: { payment_method_id: "pm_stripe_1" },
    });
    expect(calls[0].headers["Content-Type"]).toBe("application/json");
  });

  it("removes a method by Schematic's id", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      body: { data: { deleted: true }, params: {} },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(
      client.deletePaymentMethod("pm_sch/2"),
    ).resolves.toBeUndefined();
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/checkout/paymentmethod/pm_sch%2F2",
      method: "DELETE",
      body: undefined,
    });
  });

  it("throws SchematicApiError when a write is refused", async () => {
    // The server's rule, not the client's: a delete the server refuses is
    // the error it sends, body and all, for the element to show.
    const { fetchImpl } = fakeFetch(() => ({
      status: 400,
      body: { error: "cannot remove the default payment method" },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client
      .deletePaymentMethod("pm_sch_1")
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({
      status: 400,
      path: "/checkout/paymentmethod/pm_sch_1",
      message: "cannot remove the default payment method",
    });
  });

  it("reports the session it reads, and states one through to it", () => {
    const client = new SchematicBillingClient();
    const events: string[] = [];
    client.onSessionChange((event) => events.push(event.type));

    expect(client.sessionStatus).toBe("pending");
    expect(client.sessionKey).toBeUndefined();
    client.setSession({ company: "comp_a", token: "t" });
    expect(client.sessionStatus).toBe("active");
    expect(client.sessionKey).toBe(client.session.key);
    expect(events).toEqual(["started"]);
  });

  it("can be built over a session another client already holds", async () => {
    // The point of the split: a second surface over the same credential
    // mints nothing of its own, and one `setSession` moves both.
    let minted = 0;
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const session = new SchematicSession({
      session: { company: "comp_a", token: async () => `t${++minted}` },
      fetch: fetchImpl,
    });
    const first = new SchematicBillingClient(session);
    const second = new SchematicBillingClient(session);

    await first.fetchInvoices({ limit: 1, offset: 0 });
    await second.fetchInvoices({ limit: 1, offset: 0 });

    expect(minted).toBe(1);
    expect(tokens(calls)).toEqual(["t1", "t1"]);

    first.setSession({ company: "comp_b", token: "t_b" });
    expect(second.sessionStatus).toBe("active");
    expect(second.sessionKey).toBe(first.sessionKey);
  });
});

describe("fetchBillingData", () => {
  it("prefetches the query it is asked for, and says which it was", async () => {
    // Seeded under the defaults, a prefetch for another query is read by
    // nobody: the element asking that query fetches the same page again.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, {
      names: ["invoices"],
      invoices: { includePending: true },
    });
    expect(calls[0].url).toContain("include_pending=true");
    expect(data.params).toEqual({ invoices: { includePending: true } });
    expect(data.sessionKey).toBe(client.sessionKey);
  });

  it("seeds the query under the key an element asks it by", async () => {
    // `{ includePending: false }` and `{}` are the same query, and the store
    // keys the second. Seeded verbatim, the rows are read by nobody and the
    // element fetches the page again.
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireEmpty }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, {
      names: ["invoices"],
      invoices: { includePending: false },
    });
    expect(data.params).toEqual({ invoices: {} });
    expect(calls[0].url).not.toContain("include_pending");
  });

  it("prefetches invoices as a page and skips failures", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      body: {
        data: {
          count: 84,
          invoices: Array.from({ length: 12 }, (_, i) => ({ id: `i${i}` })),
        },
      },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, { names: ["invoices"] });
    expect(data.invoices).toMatchObject({ count: 84, hasMore: true });
    expect(data.invoices?.invoices).toHaveLength(12);

    const { fetchImpl: failing } = fakeFetch(() => ({
      status: 500,
      body: "x",
    }));
    const empty = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: failing,
      }),
      { names: ["invoices"] },
    );
    expect(empty.invoices).toBeUndefined();
  });

  it("prefetches each resource a page names, and only those", async () => {
    const { calls, fetchImpl } = fakeFetch(
      byPath({
        "/company/invoices": { body: wireEmpty },
        "/company/upcoming-invoice": { body: wireUpcoming },
      }),
    );
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, {
      names: ["invoices", "upcomingInvoice"],
    });
    expect(calls.map((call) => new URL(call.url).pathname).sort()).toEqual([
      "/company/invoices",
      "/company/upcoming-invoice",
    ]);
    expect(data.invoices).toMatchObject({ count: 0, hasMore: false });
    expect(data.upcomingInvoice).toMatchObject({ amountDue: 6800 });

    // A page that renders only the invoices does not pay for the preview.
    const { calls: fewer, fetchImpl: only } = fakeFetch(
      byPath({ "/company/invoices": { body: wireEmpty } }),
    );
    await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: only,
      }),
      { names: ["invoices"] },
    );
    expect(fewer.map((call) => new URL(call.url).pathname)).toEqual([
      "/company/invoices",
    ]);
  });

  it("seeds no next bill as null, and a failure as nothing", async () => {
    // `null` is the server's answer and the store must be spared asking
    // again; a failure is left out so the element asks for itself.
    const { fetchImpl } = fakeFetch(
      byPath({
        "/company/invoices": { body: wireEmpty },
        "/company/upcoming-invoice": { status: 204, body: null },
      }),
    );
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, { names: ["upcomingInvoice"] });
    expect(data.upcomingInvoice).toBeNull();
    expect(data.invoices).toBeUndefined();

    const { fetchImpl: failing } = fakeFetch(() => ({
      status: 500,
      body: "x",
    }));
    const empty = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: failing,
      }),
      { names: ["upcomingInvoice"] },
    );
    expect(empty.upcomingInvoice).toBeUndefined();
    expect("upcomingInvoice" in empty).toBe(false);
  });

  it("seeds the payment methods, an empty list included", async () => {
    // `[]` is the server's answer — nothing on file — and seeding it spares
    // the element the request; a failure is left out so it asks for itself.
    const { calls, fetchImpl } = fakeFetch(
      byPath({ "/company/payment-methods": { body: wirePaymentMethods } }),
    );
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, { names: ["paymentMethods"] });
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/company/payment-methods",
    ]);
    expect(data.paymentMethods).toHaveLength(2);
    expect(data.paymentMethods?.[0]).toMatchObject({ isDefault: true });
    expect(data.invoices).toBeUndefined();

    const { fetchImpl: none } = fakeFetch(() => ({
      body: { data: { count: 0, payment_methods: [] } },
    }));
    const empty = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: none,
      }),
      { names: ["paymentMethods"] },
    );
    expect(empty.paymentMethods).toEqual([]);

    const { fetchImpl: failing } = fakeFetch(() => ({
      status: 500,
      body: "x",
    }));
    const failed = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: failing,
      }),
      { names: ["paymentMethods"] },
    );
    expect("paymentMethods" in failed).toBe(false);
  });
});

const wireFeatureUsage = {
  data: {
    count: 2,
    features: [
      {
        access: true,
        allocation: 1000,
        company_override_id: null,
        consumption_rate: null,
        current_cost: 1500,
        entitlement_type: "plan_entitlement",
        expires_at: null,
        feature_description: "Calls to the API",
        feature_icon: "api",
        feature_id: "feat_1",
        feature_name: "API calls",
        feature_plural_name: "API calls",
        feature_singular_name: "API call",
        feature_type: "event",
        license_id: null,
        metric_period: "current_month",
        metric_period_month_reset: "first_of_month",
        per_license_credit_grants: [],
        plan_entitlement_id: "pe_1",
        price: {
          currency: "usd",
          id: "bpp_1",
          interval: "month",
          interval_count: 1,
          overage_unit_price_decimal: null,
          package_size: 1,
          price: 5,
          price_decimal: null,
          price_tiers: [],
          scheme: "per_unit",
          tiers_mode: null,
        },
        price_behavior: "overage",
        resets_at: "2026-10-01T00:00:00Z",
        soft_limit: 1000,
        usage: 1300,
        value_bool: null,
        value_numeric: 1000,
        value_type: "numeric",
        warning_threshold: 800,
      },
      {
        access: true,
        allocation: 50,
        company_override_id: "co_1",
        entitlement_type: "company_override",
        expires_at: "2026-11-01T00:00:00Z",
        feature_description: "",
        feature_icon: "",
        feature_id: "feat_2",
        feature_name: "Seats",
        feature_type: "trait",
        per_license_credit_grants: [],
        price: null,
        usage: 12,
        value_type: "numeric",
      },
    ],
  },
};

const wireFeatureUserUsage = {
  data: {
    count: 3,
    end_time: "2026-10-01T00:00:00Z",
    start_time: "2026-09-01T00:00:00Z",
    total: 900,
    unattributed: 100,
    users: [
      {
        last_seen: "2026-09-27T12:00:00Z",
        name: "Ada",
        share: 0.5,
        usage: 450,
        user_id: "user_1",
      },
      {
        last_seen: "2026-09-26T12:00:00Z",
        name: null,
        share: 0.3,
        usage: 270,
        user_id: "user_2",
      },
    ],
  },
};

describe("feature usage", () => {
  it("decodes the company's feature usage", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireFeatureUsage }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const features = await client.fetchFeatureUsage();
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/company/usage",
      method: "GET",
    });
    expect(features).toHaveLength(2);
    expect(features[0]).toMatchObject({
      featureId: "feat_1",
      entitlementType: "plan_entitlement",
      planEntitlementId: "pe_1",
      priceBehavior: "overage",
      softLimit: 1000,
      usage: 1300,
      currentCost: 1500,
      warningThreshold: 800,
      price: { currency: "usd", price: 5, packageSize: 1 },
    });
    expect(features[0].resetsAt).toEqual(new Date("2026-10-01T00:00:00Z"));
    expect(features[1]).toMatchObject({
      entitlementType: "company_override",
      companyOverrideId: "co_1",
    });
    expect(features[1].expiresAt).toEqual(new Date("2026-11-01T00:00:00Z"));
    expect(features[1].price).toBeUndefined();
  });

  it("reads no features from an empty, null or omitted list", async () => {
    for (const body of [
      { data: { count: 0, features: [] } },
      { data: { count: 0, features: null } },
      { data: { count: 0 } },
      { data: null },
    ]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(client.fetchFeatureUsage()).resolves.toEqual([]);
    }
  });

  it("reports malformed feature usage rather than reading it as none", async () => {
    for (const body of [null, "yes", { nope: 1 }]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(client.fetchFeatureUsage()).rejects.toThrow(
        /Malformed response/,
      );
    }
  });

  it("keeps a 404 on feature usage the failure it is", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 404,
      body: { error: "not found" },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client.fetchFeatureUsage().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({ status: 404, path: "/company/usage" });
  });

  it("decodes one feature's usage by user and pages it", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      body: wireFeatureUserUsage,
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const usage = await client.fetchFeatureUserUsage({
      featureId: "feat 1",
      limit: 20,
    });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/usage/feat%201/users?limit=20",
    );
    expect(usage).toMatchObject({ count: 3, total: 900, unattributed: 100 });
    expect(usage.users).toHaveLength(2);
    expect(usage.users[0]).toMatchObject({ userId: "user_1", name: "Ada" });
    expect(usage.users[1].name).toBeUndefined();

    await client.fetchFeatureUserUsage({ featureId: "feat_1" });
    expect(calls[1].url).toBe(
      "https://api.schematichq.com/company/usage/feat_1/users",
    );
  });

  it("keeps a 404 on a breakdown the company cannot read", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 404,
      body: { error: "not found" },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client
      .fetchFeatureUserUsage({ featureId: "feat_1" })
      .catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({
      status: 404,
      path: "/company/usage/feat_1/users",
    });
  });

  it("seeds feature usage, an empty list included", async () => {
    const { calls, fetchImpl } = fakeFetch(
      byPath({ "/company/usage": { body: wireFeatureUsage } }),
    );
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, { names: ["featureUsage"] });
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/company/usage",
    ]);
    expect(data.featureUsage).toHaveLength(2);

    const { fetchImpl: none } = fakeFetch(() => ({
      body: { data: { count: 0, features: [] } },
    }));
    const empty = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: none,
      }),
      { names: ["featureUsage"] },
    );
    expect(empty.featureUsage).toEqual([]);

    const { fetchImpl: failing } = fakeFetch(() => ({
      status: 500,
      body: "x",
    }));
    const failed = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: failing,
      }),
      { names: ["featureUsage"] },
    );
    expect("featureUsage" in failed).toBe(false);
  });
});

const wireCredits = {
  data: {
    count: 2,
    balances: [
      {
        composition: {
          fixed_quantity: 100,
          license_id: "lic_seats",
          license_name: "Seat",
          license_plural_name: null,
          license_quantity: 12,
          license_singular_name: null,
          per_license_amount: 10,
          period: "month",
          renews_at: "2026-10-01T00:00:00Z",
          total: 220,
        },
        credit_description: "Spent running inference",
        credit_icon: null,
        credit_id: "bcr_ai",
        credit_name: "AI credit",
        credit_plural_name: null,
        credit_singular_name: null,
        expires_at: null,
        grants: [
          {
            bundle_id: null,
            bundle_name: null,
            created_at: "2026-09-01T00:00:00Z",
            expires_at: null,
            grant_reason: "plan",
            id: "bcg_1",
            plan_id: "plan_pro",
            plan_name: "Pro",
            quantity: 220,
            quantity_remaining: 120,
            quantity_used: 100,
            renewal_period: "monthly",
            resets_at: "2026-10-01T00:00:00Z",
            valid_from: null,
          },
        ],
        purchasable: true,
        remaining: 120,
        resets_at: "2026-10-01T00:00:00Z",
        total: 220,
        used: 100,
      },
      {
        composition: null,
        credit_description: "",
        credit_id: "bcr_export",
        credit_name: "Export credit",
        grants: [],
        purchasable: false,
        remaining: 0,
        total: 0,
        used: 0,
      },
    ],
  },
};

describe("credits", () => {
  it("decodes the company's credit balances", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireCredits }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const balances = await client.fetchCreditBalances();
    expect(calls[0].url).toBe("https://api.schematichq.com/company/credits");
    expect(balances).toHaveLength(2);
    expect(balances[0]).toMatchObject({
      creditId: "bcr_ai",
      purchasable: true,
      remaining: 120,
      composition: { licenseQuantity: 12, perLicenseAmount: 10, total: 220 },
    });
    expect(balances[0].composition?.renewsAt).toEqual(
      new Date("2026-10-01T00:00:00Z"),
    );
    expect(balances[0].grants[0]).toMatchObject({
      grantReason: "plan",
      renewalPeriod: "monthly",
    });
    expect(balances[1].grants).toEqual([]);
    expect(balances[1].composition).toBeUndefined();
  });

  it("reads no credits from an empty, null or omitted list", async () => {
    for (const body of [
      { data: { count: 0, balances: [] } },
      { data: { count: 0, balances: null } },
      { data: { count: 0 } },
      { data: null },
    ]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(client.fetchCreditBalances()).resolves.toEqual([]);
    }
  });

  it("keeps a 404 on credits the failure it is", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 404,
      body: { error: "not found" },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client.fetchCreditBalances().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({ status: 404, path: "/company/credits" });
  });

  it("decodes one credit's consumption by user", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      body: {
        data: {
          count: 1,
          end_time: null,
          start_time: null,
          total: 0,
          unattributed: null,
          users: [{ name: "Ada", share: 1, used: 12.5, user_id: "user_1" }],
        },
      },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const usage = await client.fetchCreditUserUsage({
      creditId: "bcr_ai",
      limit: 20,
    });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/company/credits/bcr_ai/users?limit=20",
    );
    expect(usage.users[0]).toMatchObject({ userId: "user_1", used: 12.5 });
    expect(usage.startTime).toBeUndefined();
  });

  it("seeds credit balances, an empty list included", async () => {
    const { fetchImpl } = fakeFetch(
      byPath({ "/company/credits": { body: wireCredits } }),
    );
    const data = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      }),
      { names: ["creditBalances"] },
    );
    expect(data.creditBalances).toHaveLength(2);

    const { fetchImpl: failing } = fakeFetch(() => ({
      status: 500,
      body: "x",
    }));
    const failed = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: failing,
      }),
      { names: ["creditBalances"] },
    );
    expect("creditBalances" in failed).toBe(false);
  });
});

const wireCompany = {
  data: {
    add_ons: [
      {
        description: null,
        id: "plan_seats",
        included_credit_ids: [],
        name: "Extra seats",
        period: "one-time",
        price: 500,
      },
    ],
    custom_plan_billing: {
      activation_strategy: "on_payment",
      due_at: "2026-10-08T00:00:00Z",
      invoice_url: "https://invoice.example.com/pay",
      plan_id: "plan_custom",
      plan_name: "Enterprise",
    },
    id: "comp_a",
    name: "Acme",
    plan: {
      description: "For teams",
      id: "plan_pro",
      included_credit_ids: ["bcr_ai"],
      name: "Pro",
      period: "month",
      price: 2900,
    },
    scheduled_downgrade: null,
    subscription: {
      cancel_at: null,
      cancel_at_period_end: false,
      currency: "usd",
      next_bill_at: "2026-11-01T00:00:00Z",
      period: "month",
      period_end: "2026-11-01T00:00:00Z",
      status: "trialing",
      trial_end: "2026-11-01T00:00:00Z",
    },
  },
};

describe("company", () => {
  it("decodes the company", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireCompany }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const company = await client.fetchCompany();
    expect(calls[0].url).toBe("https://api.schematichq.com/company");
    expect(company.plan).toMatchObject({
      includedCreditIds: ["bcr_ai"],
      name: "Pro",
      price: 2900,
    });
    expect(company.addOns[0]).toMatchObject({ period: "one-time" });
    expect(company.subscription).toMatchObject({
      cancelAtPeriodEnd: false,
      status: "trialing",
    });
    expect(company.subscription?.trialEnd).toEqual(
      new Date("2026-11-01T00:00:00Z"),
    );
    expect(company.customPlanBilling).toMatchObject({
      activationStrategy: "on_payment",
      planName: "Enterprise",
    });
    expect(company.customPlanBilling?.dueAt).toEqual(
      new Date("2026-10-08T00:00:00Z"),
    );
    expect(company.scheduledDowngrade).toBeUndefined();
  });

  it("refuses a company-less body", async () => {
    const { fetchImpl } = fakeFetch(() => ({ body: { data: null } }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(client.fetchCompany()).rejects.toThrow(
      "Malformed response from /company",
    );
  });

  it("keeps a 404 on the company the failure it is", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 404,
      body: { error: "not found" },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const error = await client.fetchCompany().catch((e: unknown) => e);
    expect(error).toBeInstanceOf(SchematicApiError);
    expect(error).toMatchObject({ status: 404, path: "/company" });
  });

  it("seeds the company", async () => {
    const { fetchImpl } = fakeFetch(
      byPath({ "/company": { body: wireCompany } }),
    );
    const data = await fetchBillingData(
      new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      }),
      { names: ["company"] },
    );
    expect(data.company?.name).toBe("Acme");
  });

  it("decodes a credit's auto top-up", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      body: {
        data: {
          count: 1,
          balances: [
            {
              ...wireCredits.data.balances[1],
              auto_topup: {
                amount: 500,
                enabled: true,
                self_service: true,
                threshold_credits: 10,
              },
            },
          ],
        },
      },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const [balance] = await client.fetchCreditBalances();
    expect(balance.autoTopup).toEqual({
      amount: 500,
      enabled: true,
      selfService: true,
      thresholdCredits: 10,
    });
  });
});

describe("catalog view", () => {
  it("reads the environment's catalog and decodes it", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireCatalogView }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const catalog = await client.fetchCatalog();
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/catalog/view",
      method: "GET",
    });
    expect(catalog.capabilities.checkout).toBe(true);
    expect(catalog.checkoutSettings.customFields).toEqual([]);
    expect(catalog.plans).toHaveLength(1);
    expect(catalog.plans[0]).toMatchObject({
      id: "plan_fw7bhwPVFas",
      current: false,
      valid: true,
      autoTopups: [],
    });
    // A null compatibility list is every plan, and decodes as absent.
    expect(catalog.plans[0].compatiblePlanIds).toBeUndefined();
  });

  it("reads one catalog by id", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireCatalogView }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await client.fetchCatalog({ catalogId: "cat/1" });
    expect(calls[0].url).toBe(
      "https://api.schematichq.com/catalogs/cat%2F1/view",
    );
  });

  it("reports a malformed catalog, and keeps a 404 the failure it is", async () => {
    for (const body of [null, "yes", { nope: 1 }, { data: null }]) {
      const { fetchImpl } = fakeFetch(() => ({ body }));
      const client = new SchematicBillingClient({
        session: { company: "comp_a", token: "t" },
        fetch: fetchImpl,
      });
      await expect(client.fetchCatalog()).rejects.toThrow(/Malformed response/);
    }

    // Off the catalog flag: the account has no catalog view to read.
    const { fetchImpl } = fakeFetch(() => ({
      status: 404,
      body: { error: "not found" },
    }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    await expect(client.fetchCatalog()).rejects.toMatchObject({
      name: "SchematicApiError",
      status: 404,
    });
  });

  it("prefetches the catalog it is asked for, and says which it was", async () => {
    const { calls, fetchImpl } = fakeFetch(
      byPath({ "/catalogs/cat_2/view": { body: wireCatalogView } }),
    );
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const data = await fetchBillingData(client, {
      names: ["catalog"],
      catalog: { catalogId: "cat_2" },
    });
    expect(calls.map((call) => new URL(call.url).pathname)).toEqual([
      "/catalogs/cat_2/view",
    ]);
    expect(data.catalog?.plans).toHaveLength(1);
    expect(data.params).toEqual({ catalog: { catalogId: "cat_2" } });
  });
});

describe("checkouts", () => {
  const client = (fetchImpl: typeof fetch) =>
    new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });

  it("opens a checkout with the cart on the wire and keeps the session it names", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      status: 201,
      body: wireCheckout(),
      headers: { "X-Checkout-Session-ID": "cs_1" },
    }));
    const { checkout, sessionId } = await client(fetchImpl).createCheckout({
      addOns: [{ addOnId: "addon_1", priceId: "price_a" }],
      currency: "usd",
      payInAdvance: [{ priceId: "price_seats", quantity: 4 }],
      planId: "plan_1",
      priceId: "price_1",
    });
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/checkouts",
      method: "POST",
      body: {
        add_on_ids: [{ add_on_id: "addon_1", price_id: "price_a" }],
        auto_topup_overrides: [],
        credit_bundles: [],
        currency: "usd",
        custom_field_values: [],
        new_plan_id: "plan_1",
        new_price_id: "price_1",
        pay_in_advance: [{ price_id: "price_seats", quantity: 4 }],
        skip_trial: false,
      },
    });
    expect(checkout.id).toBe("chk_1");
    expect(checkout.priceSnapshot?.dueNow).toBe(2500);
    expect(checkout.selections.intent).toBe("change");
    expect(sessionId).toBe("cs_1");
  });

  it("leaves a credit-only cart without a plan or price", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      status: 201,
      body: wireCheckout(),
    }));
    const { sessionId } = await client(fetchImpl).createCheckout({
      creditBundles: [{ bundleId: "bundle_1", quantity: 2 }],
    });
    expect(calls[0].body).not.toHaveProperty("new_plan_id");
    expect(calls[0].body).not.toHaveProperty("new_price_id");
    expect(sessionId).toBeUndefined();
  });

  it("replaces the cart at a version, and reads back the rotated session", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      body: wireCheckout({ version: 3 }),
      headers: { "X-Checkout-Session-ID": "cs_2" },
    }));
    const { checkout, sessionId } = await client(fetchImpl).updateCheckout(
      "chk_1",
      2,
      { planId: "plan_1", priceId: "price_1", promoCode: "SAVE10" },
    );
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/checkouts/chk_1",
      method: "PUT",
      body: { version: 2, promo_code: "SAVE10" },
    });
    expect(checkout.version).toBe(3);
    expect(sessionId).toBe("cs_2");
  });

  it("finalizes at a version under the session it was priced in", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({
      body: wireCheckoutResult({
        confirmPaymentIntentClientSecret: "pi_secret",
      }),
    }));
    const result = await client(fetchImpl).finalizeCheckout("chk_1", 3, {
      sessionId: "cs_2",
    });
    expect(calls[0]).toMatchObject({
      url: "https://api.schematichq.com/checkouts/chk_1/finalize",
      method: "POST",
      body: { version: 3 },
    });
    expect(calls[0].headers["X-Checkout-Session-ID"]).toBe("cs_2");
    expect(result.confirmPaymentIntentClientSecret).toBe("pi_secret");

    const { calls: bare, fetchImpl: bareFetch } = fakeFetch(() => ({
      body: wireCheckoutResult(),
    }));
    await client(bareFetch).finalizeCheckout("chk_1", 3);
    expect(bare[0].headers).not.toHaveProperty("X-Checkout-Session-ID");
  });

  it("reads a checkout by id", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireCheckout() }));
    const checkout = await client(fetchImpl).getCheckout("chk_1");
    expect(calls[0].url).toBe("https://api.schematichq.com/checkouts/chk_1");
    expect(checkout.status).toBe("open");
  });

  it("reads the problems off a refused finalize, and nothing off other errors", async () => {
    const { fetchImpl } = fakeFetch(() => ({
      status: 400,
      body: {
        error: "Add a payment method to complete this checkout.",
        problems: [
          {
            blocking: true,
            code: "payment_method_required",
            message: "Add a payment method to complete this checkout.",
            source: "requirement",
          },
        ],
      },
    }));
    const error = await client(fetchImpl)
      .finalizeCheckout("chk_1", 3)
      .catch((e: unknown) => e);
    expect(checkoutProblemsOf(error)).toEqual([
      expect.objectContaining({
        blocking: true,
        code: "payment_method_required",
      }),
    ]);

    const { fetchImpl: conflict } = fakeFetch(() => ({
      status: 409,
      body: { error: "The checkout changed since it was read." },
    }));
    const stale = await client(conflict)
      .updateCheckout("chk_1", 1, {})
      .catch((e: unknown) => e);
    expect(stale).toMatchObject({ name: "SchematicApiError", status: 409 });
    expect(checkoutProblemsOf(stale)).toBeUndefined();
    expect(checkoutProblemsOf(new Error("x"))).toBeUndefined();
  });
});

describe("tax IDs", () => {
  const wireTaxIds = {
    data: {
      tax_ids: [
        {
          country: "DE",
          id: "txi_1",
          type: "eu_vat",
          value: "DE123456789",
          verification_status: "verified",
        },
      ],
    },
  };

  it("reads the tax IDs on file", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireTaxIds }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const taxIds = await client.fetchTaxIds();
    expect(calls[0].url).toBe("https://api.schematichq.com/checkout/tax-id");
    expect(taxIds).toEqual([
      expect.objectContaining({ type: "eu_vat", value: "DE123456789" }),
    ]);
  });

  it("sets a tax ID and answers with what is now on file", async () => {
    const { calls, fetchImpl } = fakeFetch(() => ({ body: wireTaxIds }));
    const client = new SchematicBillingClient({
      session: { company: "comp_a", token: "t" },
      fetch: fetchImpl,
    });
    const taxIds = await client.updateTaxId({
      type: "eu_vat",
      value: "DE123456789",
    });
    expect(calls[0]).toMatchObject({
      method: "POST",
      body: { tax_id: { type: "eu_vat", value: "DE123456789" } },
    });
    expect(taxIds).toHaveLength(1);
  });
});
