/**
 * Fixtures shared by the billing specs. Not exported from the package: both
 * specs drive the same transport from different heights, and a copy each is
 * a copy that drifts.
 */

import { vi } from "vitest";

export type Call = {
  url: string;
  method: string;
  headers: Record<string, string>;
  /** The request body, parsed; `undefined` when the call carried none. */
  body: unknown;
};

export function fakeFetch(
  respond: (
    url: string,
    headers: Record<string, string>,
  ) => {
    status?: number;
    body?: unknown;
  } = () => ({}),
) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      calls.push({
        url,
        method: init?.method ?? "GET",
        headers,
        body:
          typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      });
      const { status = 200, body = { ok: true } } = respond(url, headers);
      // A 204 may not carry a body, even an empty one; `body: null` on any
      // other status is an empty body, which is how a malformed 200 reads.
      const raw = body === null ? "" : JSON.stringify(body);
      return new Response(status === 204 ? null : raw, {
        status,
        headers: { "Content-Type": "application/json" },
      });
    },
  );
  return { calls, fetchImpl: fetchImpl as unknown as typeof fetch };
}

/** The credential each call carried, in order. */
export const tokens = (calls: Call[]): string[] =>
  calls.map((call) => call.headers["X-Schematic-Api-Key"]);

/**
 * `GET /catalog/view` and `GET /company` as the API answers them: its route
 * tests' goldens (schematic-api
 * apps/checkoutexternal/web/testdata/goldens), copied as recorded.
 */
export const wireCatalogView = {
  data: {
    capabilities: {
      badge_visibility: false,
      checkout: true,
    },
    custom_plan_cta: {
      cta_text: null,
      cta_url: null,
      price_text: null,
    },
    default_currency: "usd",
    description: null,
    id: "cat_fw7bhwPVFas",
    name: "Default",
    pricing_model: null,
    pricing_url: null,
    checkout_settings: {
      bundle_purchase_behavior: "quantity",
      collect_address: false,
      collect_email: false,
      collect_phone: false,
      collect_tax_id: false,
      custom_fields: [],
      proration_behavior: "invoice_immediately",
      tax_collection_enabled: false,
    },
    prevent_self_service_downgrade: false,
    prevent_self_service_downgrade_button_text: null,
    prevent_self_service_downgrade_url: null,
    trial_expiry_plan: null,
    trial_payment_method_required: null,
    add_ons: [],
    credit_bundles: [],
    plans: [
      {
        available_periods: ["monthly", "quarterly", "yearly"],
        billing_strategy: "provider_managed",
        charge_type: "recurring",
        compatible_plan_ids: null,
        currency_prices: [
          {
            currency: "usd",
            monthly_price: {
              currency: "usd",
              id: "bilpp_fw7bhwPVFas",
              interval: "month",
              interval_count: 1,
              overage_unit_price_decimal: null,
              package_size: 1,
              price: 10000,
              price_decimal: null,
              price_tiers: [],
              scheme: "per_unit",
              tiers_mode: null,
            },
            one_time_price: null,
            quarterly_price: {
              currency: "usd",
              id: "bilpp_8iLXw7U4wNh",
              interval: "month",
              interval_count: 3,
              overage_unit_price_decimal: null,
              package_size: 1,
              price: 27000,
              price_decimal: null,
              price_tiers: [],
              scheme: "per_unit",
              tiers_mode: null,
            },
            yearly_price: {
              currency: "usd",
              id: "bilpp_PA2DgbCphEY",
              interval: "year",
              interval_count: 1,
              overage_unit_price_decimal: null,
              package_size: 1,
              price: 190000,
              price_decimal: null,
              price_tiers: [],
              scheme: "per_unit",
              tiers_mode: null,
            },
          },
        ],
        description:
          "Fear besides wheat upon how any Spanish calmly every beautiful.",
        entitlements: [],
        icon: "yellow",
        id: "plan_fw7bhwPVFas",
        included_credit_grants: [],
        is_trialable: false,
        monthly_price: {
          currency: "usd",
          id: "bilpp_fw7bhwPVFas",
          interval: "month",
          interval_count: 1,
          overage_unit_price_decimal: null,
          package_size: 1,
          price: 10000,
          price_decimal: null,
          price_tiers: [],
          scheme: "per_unit",
          tiers_mode: null,
        },
        name: "Sheep f926c6cf-ce31-4f4a-b6ae-5095e9025c35",
        one_time_price: null,
        quarterly_price: {
          currency: "usd",
          id: "bilpp_8iLXw7U4wNh",
          interval: "month",
          interval_count: 3,
          overage_unit_price_decimal: null,
          package_size: 1,
          price: 27000,
          price_decimal: null,
          price_tiers: [],
          scheme: "per_unit",
          tiers_mode: null,
        },
        trial_days: null,
        yearly_price: {
          currency: "usd",
          id: "bilpp_PA2DgbCphEY",
          interval: "year",
          interval_count: 1,
          overage_unit_price_decimal: null,
          package_size: 1,
          price: 190000,
          price_decimal: null,
          price_tiers: [],
          scheme: "per_unit",
          tiers_mode: null,
        },
        auto_topups: [],
        company_can_trial: false,
        current: false,
        invalid_reason: null,
        usage_violations: [],
        valid: true,
      },
    ],
  },
};
