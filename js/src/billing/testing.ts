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
    request: { method: string; body: unknown },
  ) => {
    status?: number;
    body?: unknown;
    /** Response headers beside the content type. */
    headers?: Record<string, string>;
  } = () => ({}),
) {
  const calls: Call[] = [];
  const fetchImpl = vi.fn(
    async (input: RequestInfo | URL, init?: RequestInit) => {
      const url = String(input);
      const headers = (init?.headers ?? {}) as Record<string, string>;
      const call: Call = {
        url,
        method: init?.method ?? "GET",
        headers,
        body:
          typeof init?.body === "string" ? JSON.parse(init.body) : undefined,
      };
      calls.push(call);
      const {
        status = 200,
        body = { ok: true },
        headers: responseHeaders = {},
      } = respond(url, headers, { method: call.method, body: call.body });
      // A 204 may not carry a body, even an empty one; `body: null` on any
      // other status is an empty body, which is how a malformed 200 reads.
      const raw = body === null ? "" : JSON.stringify(body);
      return new Response(status === 204 ? null : raw, {
        status,
        headers: { "Content-Type": "application/json", ...responseHeaders },
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

/** A priced checkout as `GET /checkouts/{checkout_id}` answers it. */
export function wireCheckout(
  overrides: { version?: number; status?: string; problems?: unknown[] } = {},
) {
  return {
    data: {
      company_id: "comp_a",
      created_at: "2026-09-28T12:00:00Z",
      expires_at: "2026-10-05T12:00:00Z",
      id: "chk_1",
      last_activity_at: "2026-09-28T12:00:00Z",
      price_snapshot: {
        amount_off: 0,
        currency: "usd",
        discount_amount: 0,
        discounts: [],
        due_now: 2500,
        is_scheduled_downgrade: false,
        new_charges: 2500,
        opt_in_required: false,
        payment_method_required: true,
        percent_off: 0,
        period_start: "2026-09-28T12:00:00Z",
        priced_at: "2026-09-28T12:00:00Z",
        promo_code_applied: false,
        proration: 0,
        total_per_billing_period: 2500,
      },
      priced_at: "2026-09-28T12:00:00Z",
      problems: overrides.problems ?? [],
      selections: {
        add_on_ids: [],
        auto_topup_overrides: [],
        billing_entity_id: null,
        coupon_external_id: null,
        credit_bundles: [],
        currency: "usd",
        custom_field_values: [],
        intent: "change",
        new_plan_id: "plan_1",
        new_price_id: "price_1",
        opt_in_accepted: null,
        pay_in_advance: [],
        payment_method_id: null,
        promo_code: null,
        skip_trial: false,
      },
      status: overrides.status ?? "open",
      updated_at: "2026-09-28T12:00:00Z",
      version: overrides.version ?? 1,
    },
  };
}

/** What a finalize answers: the subscription it charged for. */
export function wireCheckoutResult(
  overrides: { confirmPaymentIntentClientSecret?: string } = {},
) {
  return {
    data: {
      cancel_at_period_end: false,
      confirm_payment_intent_client_secret:
        overrides.confirmPaymentIntentClientSecret ?? null,
      created_at: "2026-09-28T12:00:00Z",
      currency: "usd",
      customer_external_id: "cus_1",
      id: "bilsub_1",
      interval: "month",
      period_end: 1790000000,
      period_start: 1787000000,
      provider_type: "stripe",
      status: "active",
      subscription_external_id: "sub_1",
      total_price: 2500,
    },
  };
}
