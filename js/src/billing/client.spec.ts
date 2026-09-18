import { SchematicBillingClient, fetchBillingData } from "./client";
import { fakeFetch, tokens } from "./testing";
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
