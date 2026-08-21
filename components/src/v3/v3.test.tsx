import {
  SchematicCustomerClient,
  SchematicProvider,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";

import { CreditUsage } from "./CreditUsage";
import { PricingTable } from "./PricingTable";
import { UpcomingBill } from "./UpcomingBill";

const jsonResponse = (body: unknown) =>
  new Response(JSON.stringify(body), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });

const envelope = (data: unknown) => ({ data, params: {} });

const price = (amount: number, interval: "month" | "year") => ({
  currency: "usd",
  id: `bilp_${interval}`,
  interval,
  interval_count: 1,
  package_size: 1,
  price: amount,
  price_tiers: [],
  scheme: "per_unit",
});

const catalogData = {
  id: "ctlg_1",
  name: "Default",
  capabilities: { badge_visibility: false, checkout: false },
  default_currency: "usd",
  plans: [
    {
      available_periods: ["monthly", "yearly"],
      billing_strategy: "provider_managed",
      charge_type: "recurring",
      compatible_plan_ids: null,
      currency_prices: [],
      description: "For getting started",
      entitlements: [
        {
          currency_prices: [],
          feature_description: "",
          feature_icon: "sparkle",
          feature_id: "feat_1",
          feature_name: "Seats",
          feature_type: "trait",
          id: "pltl_1",
          value_type: "numeric",
          value_numeric: 5,
        },
      ],
      icon: "rocket",
      id: "plan_1",
      included_credit_grants: [],
      is_trialable: false,
      monthly_price: price(1000, "month"),
      name: "Starter",
      yearly_price: price(10000, "year"),
    },
  ],
  add_ons: [],
  credit_bundles: [],
};

const routedFetch = (routes: Record<string, unknown>) =>
  vi.fn(async (input: RequestInfo | URL) => {
    const url = String(input);
    for (const [fragment, body] of Object.entries(routes)) {
      if (url.includes(fragment)) {
        return jsonResponse(envelope(body));
      }
    }
    throw new Error(`unrouted request: ${url}`);
  }) as unknown as typeof fetch;

const withProvider = (
  client: SchematicCustomerClient,
  children: React.ReactNode,
) => (
  <SchematicProvider customerClient={client} publishableKey="api_pub">
    {children}
  </SchematicProvider>
);

describe("v3 elements", () => {
  it("PricingTable renders plans, prices, savings, and entitlements", async () => {
    const client = new SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi: routedFetch({ "/public/catalog": catalogData }),
    });
    render(withProvider(client, <PricingTable locale="en-US" />));

    await waitFor(() => {
      expect(screen.getByText("Starter")).toBeDefined();
    });
    expect(screen.getByText("$10.00")).toBeDefined();
    expect(screen.getByText("5 Seats")).toBeDefined();
    // Period toggle offers both cadences, labeled as in the v2 embed.
    expect(screen.getByRole("button", { name: "Billed yearly" })).toBeDefined();
    screen.getByRole("button", { name: "Billed yearly" }).click();
    await waitFor(() => {
      expect(screen.getByText("$100.00")).toBeDefined();
    });
  });

  it("CreditUsage renders burndown and the grant ledger", async () => {
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi: routedFetch({
        "/company/credits": {
          balances: [
            {
              credit_description: "",
              credit_id: "bcrd_1",
              credit_name: "AI Credits",
              grants: [
                {
                  created_at: "2026-01-01T00:00:00Z",
                  grant_reason: "plan",
                  id: "bcgr_1",
                  plan_name: "Starter",
                  quantity: 100,
                  quantity_remaining: 25,
                  quantity_used: 75,
                },
              ],
              remaining: 25,
              total: 100,
              used: 75,
            },
          ],
        },
      }),
    });
    render(withProvider(client, <CreditUsage locale="en-US" />));

    await waitFor(() => {
      expect(screen.getByText("AI Credits")).toBeDefined();
    });
    expect(screen.getByText("25 of 100 left")).toBeDefined();
    expect(screen.getByRole("progressbar").getAttribute("aria-valuenow")).toBe(
      "75",
    );
    // The grant ledger labels the grant from its structured source (plan name).
    expect(screen.getByText("Starter")).toBeDefined();
  });

  it("UpcomingBill renders totals, discounts, and applied balance", async () => {
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi: routedFetch({
        "/company/upcoming-invoice": {
          amount_due: 4000,
          currency: "usd",
          customer_balance_applied: 1000,
          customer_balance_remaining: 500,
          discounts: [
            { coupon_name: "LAUNCH", duration: "repeating", percent_off: 50 },
          ],
          due_date: "2026-03-01T00:00:00Z",
          subtotal: 10000,
        },
      }),
    });
    render(withProvider(client, <UpcomingBill locale="en-US" />));

    await waitFor(() => {
      expect(screen.getByText("$40.00")).toBeDefined();
    });
    expect(screen.getByText("$100.00")).toBeDefined();
    expect(screen.getByText("LAUNCH")).toBeDefined();
    expect(screen.getByText("−50%")).toBeDefined();
    expect(screen.getByText("−$10.00")).toBeDefined();
    expect(screen.getByText(/\$5\.00 credit remains/)).toBeDefined();
  });

  it("UpcomingBill shows an empty state when nothing is upcoming (404)", async () => {
    const notFoundFetch = vi.fn(
      async () =>
        new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        }),
    ) as unknown as typeof fetch;
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi: notFoundFetch,
    });
    render(withProvider(client, <UpcomingBill locale="en-US" />));

    await waitFor(() => {
      expect(screen.getByText("No upcoming bill.")).toBeDefined();
    });
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("company-scoped elements show an error state without a token", () => {
    const client = new SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi: routedFetch({ "/public/catalog": catalogData }),
    });
    render(withProvider(client, <CreditUsage />));
    expect(screen.getByRole("alert").textContent).toMatch(/accessToken/);
  });
});

describe("v3 elements branch-audit regressions", () => {
  const oneTimePrice = {
    currency: "usd",
    id: "bilp_once",
    interval: "one_time",
    interval_count: 1,
    package_size: 1,
    price: 9900,
    price_tiers: [],
    scheme: "per_unit",
  };
  const bundle = {
    bundle_type: "fixed",
    credit_id: "bcrd_1",
    credit_name: "AI Credits",
    currency_prices: [],
    expiry_type: "never",
    expiry_unit: "month",
    id: "bndl_1",
    name: "Top-up",
    price: { ...oneTimePrice, id: "bilp_bundle", price: 2000 },
    quantity: 100,
  };
  const companyCatalog = {
    ...catalogData,
    add_ons: [
      {
        ...catalogData.plans[0],
        available_periods: [],
        charge_type: "one_time",
        company_can_trial: false,
        current: false,
        entitlements: [],
        id: "addon_once",
        monthly_price: undefined,
        name: "Onboarding",
        one_time_price: oneTimePrice,
        usage_violations: [],
        valid: true,
        yearly_price: undefined,
      },
    ],
    checkout_settings: {
      collect_address: false,
      collect_email: false,
      collect_phone: false,
      collect_tax_id: false,
      proration_behavior: "invoice_immediately",
      tax_collection_enabled: false,
    },
    credit_bundles: [bundle],
    plans: [
      {
        ...catalogData.plans[0],
        company_can_trial: true,
        current: false,
        is_trialable: true,
        trial_days: 14,
        usage_violations: [],
        valid: true,
      },
    ],
    prevent_self_service_downgrade: false,
  };

  it("PricingTable offers a trial CTA and prices one-time add-ons at their own period", async () => {
    const onSelectPlan = vi.fn();
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi: routedFetch({ "/catalog/view": companyCatalog }),
    });
    render(
      withProvider(
        client,
        <PricingTable
          className="custom"
          locale="en-US"
          onSelectPlan={onSelectPlan}
        />,
      ),
    );

    await waitFor(() => {
      expect(screen.getByText("Starter")).toBeDefined();
    });
    expect(document.querySelector(".schematic-pricing-table")?.className).toBe(
      "schematic-pricing-table custom",
    );
    const trial = screen.getByRole("button", { name: "Start 14-day trial" });
    fireEvent.click(trial);
    expect(onSelectPlan).toHaveBeenCalledWith(
      expect.objectContaining({ canTrial: true, id: "plan_1" }),
      expect.objectContaining({ period: "month" }),
    );

    // The one-time add-on shows its one-time price under the monthly toggle…
    expect(screen.getByText("$99.00")).toBeDefined();
    // …and keeps it when the toggle changes.
    fireEvent.click(screen.getByRole("button", { name: "Billed yearly" }));
    await waitFor(() => {
      expect(screen.getByText("$100.00")).toBeDefined();
    });
    expect(screen.getByText("$99.00")).toBeDefined();
  });

  it("CreditUsage offers to buy more from the catalog's bundles", async () => {
    const onBuyBundle = vi.fn();
    const client = new SchematicCustomerClient({
      accessToken: "token_1",
      fetchApi: routedFetch({
        "/catalog/view": companyCatalog,
        "/company/credits": {
          balances: [
            {
              credit_description: "",
              credit_id: "bcrd_1",
              credit_name: "AI Credits",
              grants: [],
              remaining: 25,
              total: 100,
              used: 75,
            },
            {
              credit_description: "",
              credit_id: "bcrd_2",
              credit_name: "Other Credits",
              grants: [],
              remaining: 1,
              total: 1,
              used: 0,
            },
          ],
        },
      }),
    });
    render(
      withProvider(
        client,
        <CreditUsage locale="en-US" onBuyBundle={onBuyBundle} />,
      ),
    );

    await waitFor(() => {
      expect(screen.getByText("AI Credits")).toBeDefined();
    });
    // Only the credit the catalog sells a bundle for gets the action.
    await waitFor(() => {
      expect(screen.getAllByRole("button", { name: "Buy more" })).toHaveLength(
        1,
      );
    });
    fireEvent.click(screen.getByRole("button", { name: "Buy more" }));
    expect(onBuyBundle).toHaveBeenCalledWith(
      expect.objectContaining({ creditId: "bcrd_1", id: "bndl_1" }),
    );
  });

  it("elements offer a retry that re-runs a failed request", async () => {
    let attempt = 0;
    const fetchApi = vi.fn(async () => {
      attempt += 1;
      if (attempt === 1) {
        return new Response(JSON.stringify({ error: "boom" }), {
          status: 500,
          headers: { "Content-Type": "application/json" },
        });
      }
      return jsonResponse(envelope(catalogData));
    }) as unknown as typeof fetch;
    const client = new SchematicCustomerClient({
      publishableKey: "api_pub",
      fetchApi,
    });
    render(withProvider(client, <PricingTable locale="en-US" />));

    await waitFor(() => {
      expect(screen.getByRole("alert")).toBeDefined();
    });
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    await waitFor(() => {
      expect(screen.getByText("Starter")).toBeDefined();
    });
    expect(attempt).toBe(2);
  });
});
