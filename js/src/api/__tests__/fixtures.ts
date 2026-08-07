/**
 * Snake_case wire fixtures matching what the Schematic API actually returns,
 * so every test exercises the generated FromJSON mappers.
 */

export function makeWirePlan(overrides?: Record<string, unknown>) {
  return {
    id: "plan_basic",
    name: "Basic",
    description: "The basic plan",
    plan_type: "plan",
    custom: false,
    is_custom: false,
    is_default: false,
    is_free: false,
    is_trialable: false,
    audience_type: null,
    available_periods: ["month"],
    billing_strategy: "recurring",
    charge_type: "recurring",
    company_count: 0,
    compatible_plan_ids: [],
    controlled_by: "stripe",
    created_at: "2026-01-01T00:00:00Z",
    updated_at: "2026-01-01T00:00:00Z",
    credits: [],
    currency_prices: [],
    features: [],
    entitlements: [],
    included_credit_grants: [],
    icon: "flag",
    versions: [],
    monthly_price: {
      id: "price_1",
      currency: "usd",
      interval: "month",
      price: 1000,
      price_decimal: null,
      price_external_id: "px_1",
      product_external_id: "prod_1",
      scheme: "per_unit",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      is_active: true,
      meter_id: null,
      price_tier: [],
      billing_scheme: "per_unit",
      package_size: 1,
      usage_type: "licensed",
      tiers_mode: null,
    },
    ...overrides,
  };
}

export function makeWireCompanyPlan(overrides?: Record<string, unknown>) {
  return makeWirePlan({
    company_can_trial: false,
    current: false,
    valid: true,
    invalid_reason: null,
    usage_violations: [],
    ...overrides,
  });
}

export const wireDisplaySettings = {
  show_as_monthly_prices: false,
  show_credits: true,
  show_feature_description: true,
  show_hard_limit: true,
  show_period_toggle: true,
  show_zero_price_as_free: false,
};

export function makeWireHydrate(overrides?: Record<string, unknown>) {
  return {
    active_plans: [makeWireCompanyPlan({ id: "plan_basic", current: true })],
    active_add_ons: [],
    active_usage_based_entitlements: [],
    add_on_compatibilities: [],
    capabilities: { badge_visibility: true, checkout: false },
    checkout_settings: {
      collect_email: false,
      collect_address: false,
      collect_phone: false,
      proration_behavior: "create_prorations",
      tax_collection_enabled: false,
    },
    credit_bundles: [],
    credit_grants: [],
    custom_checkout_fields: [],
    display_settings: wireDisplaySettings,
    feature_usage: { features: [] },
    prevent_self_service_downgrade: false,
    show_as_monthly_prices: false,
    show_credits: true,
    show_period_toggle: true,
    show_zero_price_as_free: false,
    trial_payment_method_required: false,
    ...overrides,
  };
}

export function makeWirePublicPlans(overrides?: Record<string, unknown>) {
  return {
    active_plans: [makeWirePlan({ id: "plan_basic" })],
    active_add_ons: [],
    add_on_compatibilities: [],
    capabilities: { badge_visibility: true },
    display_settings: wireDisplaySettings,
    show_as_monthly_prices: false,
    show_credits: true,
    show_period_toggle: true,
    show_zero_price_as_free: false,
    ...overrides,
  };
}

export function makeWireInvoice(overrides?: Record<string, unknown>) {
  return {
    id: "inv_1",
    amount_due: 1000,
    amount_paid: 1000,
    amount_remaining: 0,
    collection_method: "charge_automatically",
    company_id: "comp_demo",
    created_at: "2026-01-15T00:00:00Z",
    updated_at: "2026-01-15T00:00:00Z",
    currency: "usd",
    customer_external_id: "cus_1",
    due_date: "2026-01-15T00:00:00Z",
    ending_balance: 0,
    environment_id: "env_1",
    external_id: "in_1",
    provider_type: "stripe",
    starting_balance: 0,
    status: "paid",
    subtotal: 1000,
    url: "https://example.com/invoice/1",
    ...overrides,
  };
}

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export function envelope(data: unknown): {
  data: unknown;
  params: Record<string, never>;
} {
  return { data, params: {} };
}
