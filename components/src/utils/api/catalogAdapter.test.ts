import { beforeEach, describe, expect, test } from "vitest";

import { CompanyCatalogResponseDataFromJSON } from "../../api/checkoutexternal";

import {
  adaptCatalog,
  getRecordedGaps,
  resetRecordedGaps,
} from "./catalogAdapter";

// Wire fixture mirroring the reference client's pinned catalog body
// (clicks/tui/client/client_test.go), extended with a compatible-with-none
// add-on and a credit bundle to exercise every adapter branch.
const catalogViewFixture = {
  id: "ctlg_test",
  name: "Default",
  checkout_settings: {
    bundle_purchase_behavior: "individual",
    collect_address: false,
    collect_email: true,
    collect_phone: false,
    collect_tax_id: false,
    proration_behavior: "create_prorations",
    tax_collection_enabled: false,
  },
  prevent_self_service_downgrade: false,
  prevent_self_service_downgrade_button_text: null,
  prevent_self_service_downgrade_url: null,
  trial_payment_method_required: null,
  credit_bundles: [
    {
      id: "bilcb_1",
      name: "Starter credits",
      bundle_type: "one_time",
      credit_id: "bilc_1",
      credit_name: "API credits",
      credit_icon: null,
      singular_name: "credit",
      plural_name: "credits",
      quantity: 1000,
      expiry_type: "no_expiry",
      expiry_unit: "day",
      expiry_unit_count: null,
      price: {
        id: "bilpp_bundle",
        price: 900,
        currency: "usd",
        interval: "one_time",
        interval_count: 0,
        period: "one_time",
        package_size: 1,
        price_decimal: null,
        scheme: "per_unit",
      },
      unit_price: null,
      currency_prices: [],
    },
  ],
  plans: [
    {
      id: "plan_base",
      name: "Pro",
      description: "The pro plan",
      icon: "",
      available_periods: ["monthly", "quarterly", "yearly"],
      compatible_plan_ids: null,
      current: true,
      valid: true,
      invalid_reason: null,
      company_can_trial: false,
      is_trialable: false,
      trial_days: null,
      monthly_price: {
        id: "bilpp_m",
        price: 1000,
        currency: "usd",
        interval: "month",
        interval_count: 1,
        period: "month",
        package_size: 1,
        price_decimal: null,
        scheme: "per_unit",
      },
      quarterly_price: {
        id: "bilpp_q",
        price: 2700,
        currency: "usd",
        interval: "month",
        interval_count: 3,
        period: "quarter",
        package_size: 1,
        price_decimal: null,
        scheme: "per_unit",
      },
      yearly_price: {
        id: "bilpp_y",
        price: 10000,
        currency: "usd",
        interval: "year",
        interval_count: 1,
        period: "year",
        package_size: 1,
        price_decimal: null,
        scheme: "per_unit",
      },
      one_time_price: null,
      currency_prices: [],
      entitlements: [
        {
          id: "plent_seats",
          feature_id: "feat_seats",
          feature_name: "Seats",
          price_behavior: "pay_in_advance",
          usage_quantity: 4,
          metered_monthly_price: {
            id: "bilpp_seats_m",
            price: 500,
            currency: "usd",
            interval: "month",
            interval_count: 1,
            period: "month",
            package_size: 1,
            price_decimal: null,
            scheme: "per_unit",
          },
          metered_quarterly_price: null,
          metered_yearly_price: null,
          currency_prices: [
            {
              currency: "eur",
              monthly_price: {
                id: "bilpp_seats_m_eur",
                price: 550,
                currency: "eur",
                interval: "month",
                interval_count: 1,
                period: "month",
                package_size: 1,
                price_decimal: null,
                scheme: "per_unit",
              },
              quarterly_price: null,
              yearly_price: null,
              one_time_price: null,
            },
          ],
        },
      ],
    },
  ],
  add_ons: [
    {
      id: "plan_addon",
      name: "Support",
      description: "",
      icon: "",
      available_periods: ["monthly"],
      compatible_plan_ids: ["plan_base"],
      current: false,
      valid: true,
      invalid_reason: null,
      company_can_trial: false,
      is_trialable: false,
      trial_days: null,
      monthly_price: {
        id: "bilpp_addon_m",
        price: 300,
        currency: "usd",
        interval: "month",
        interval_count: 1,
        period: "month",
        package_size: 1,
        price_decimal: null,
        scheme: "per_unit",
      },
      quarterly_price: null,
      yearly_price: null,
      one_time_price: null,
      currency_prices: [],
      entitlements: [],
    },
    {
      id: "plan_addon_orphan",
      name: "Orphan",
      description: "",
      icon: "",
      available_periods: ["monthly"],
      // New semantics: [] = compatible with no plan. Inexpressible in the
      // legacy shape; the adapter must drop this add-on (gap #6).
      compatible_plan_ids: [],
      current: false,
      valid: true,
      invalid_reason: null,
      company_can_trial: false,
      is_trialable: false,
      trial_days: null,
      monthly_price: null,
      quarterly_price: null,
      yearly_price: null,
      one_time_price: null,
      currency_prices: [],
      entitlements: [],
    },
    {
      id: "plan_addon_universal",
      name: "Universal",
      description: "",
      icon: "",
      available_periods: ["monthly"],
      // New semantics: null = compatible with every plan; legacy encodes
      // that as an empty list.
      compatible_plan_ids: null,
      current: false,
      valid: true,
      invalid_reason: null,
      company_can_trial: false,
      is_trialable: false,
      trial_days: null,
      monthly_price: null,
      quarterly_price: null,
      yearly_price: null,
      one_time_price: null,
      currency_prices: [],
      entitlements: [],
    },
  ],
};

function adaptFixture() {
  return adaptCatalog(CompanyCatalogResponseDataFromJSON(catalogViewFixture));
}

describe("adaptCatalog", () => {
  beforeEach(() => {
    resetRecordedGaps();
  });

  test("maps plans onto the legacy detail shape", () => {
    const overlay = adaptFixture();

    expect(overlay.activePlans).toHaveLength(1);
    const plan = overlay.activePlans[0];
    expect(plan.id).toBe("plan_base");
    expect(plan.name).toBe("Pro");
    expect(plan.current).toBe(true);
    expect(plan.valid).toBe(true);
    expect(plan.availablePeriods).toEqual(["monthly", "quarterly", "yearly"]);
    expect(plan.monthlyPrice?.id).toBe("bilpp_m");
    expect(plan.monthlyPrice?.price).toBe(1000);
    expect(plan.quarterlyPrice?.interval).toBe("month");
    expect(plan.quarterlyPrice?.intervalCount).toBe(3);
    expect(plan.yearlyPrice?.price).toBe(10000);
    expect(plan.oneTimePrice).toBeUndefined();
    // Derived: recurring slots present.
    expect(plan.chargeType).toBe("recurring");
    expect(plan.isFree).toBe(false);
  });

  test("maps entitlements with metered and multi-currency prices", () => {
    const overlay = adaptFixture();

    const entitlements = overlay.activePlans[0].entitlements;
    expect(entitlements).toHaveLength(1);
    const seats = entitlements?.[0];
    expect(seats?.id).toBe("plent_seats");
    expect(seats?.planId).toBe("plan_base");
    expect(seats?.priceBehavior).toBe("pay_in_advance");
    expect(seats?.usageQuantity).toBe(4);
    expect(seats?.feature?.name).toBe("Seats");
    expect(seats?.meteredMonthlyPrice?.priceId).toBe("bilpp_seats_m");
    expect(seats?.currencyPrices).toHaveLength(1);
    expect(seats?.currencyPrices[0].currency).toBe("eur");
    expect(seats?.currencyPrices[0].monthlyPrice?.price).toBe(550);
  });

  test("translates compatibility semantics and drops none-compatible add-ons", () => {
    const overlay = adaptFixture();

    // plan_addon_orphan ([] = none) is inexpressible in the legacy shape.
    expect(overlay.activeAddOns.map((a) => a.id)).toEqual([
      "plan_addon",
      "plan_addon_universal",
    ]);

    // null (all) becomes the legacy all-encoding: an empty list.
    const universal = overlay.activeAddOns.find(
      (a) => a.id === "plan_addon_universal",
    );
    expect(universal?.compatiblePlanIds).toEqual([]);

    // Enumerated lists pass through and produce a compatibility row.
    expect(overlay.addOnCompatibilities).toEqual([
      { sourcePlanId: "plan_addon", compatiblePlanIds: ["plan_base"] },
    ]);
  });

  test("maps credit bundles, treating all as plan-compatible (gap #23)", () => {
    const overlay = adaptFixture();

    expect(overlay.creditBundles).toHaveLength(1);
    const bundle = overlay.creditBundles[0];
    expect(bundle.id).toBe("bilcb_1");
    expect(bundle.creditName).toBe("API credits");
    expect(bundle.quantity).toBe(1000);
    expect(bundle.price?.price).toBe(900);
    // Legacy semantics: empty list = compatible with every plan.
    expect(bundle.compatiblePlanIds).toEqual([]);
  });

  test("passes checkout settings through and defaults null trial requirement to required", () => {
    const overlay = adaptFixture();

    expect(overlay.checkoutSettings.collectEmail).toBe(true);
    expect(overlay.checkoutSettings.prorationBehavior).toBe(
      "create_prorations",
    );
    expect(overlay.trialPaymentMethodRequired).toBe(true);
    expect(overlay.preventSelfServiceDowngrade).toBe(false);
  });

  test("records the gaps it exercises", () => {
    adaptFixture();

    const gaps = new Set(getRecordedGaps().map(({ gap }) => gap));
    // Fabricated grants (#1), dropped none-compatible add-on (#6), pricing-only
    // entitlements (#7), derived charge type (#8), price provider fields (#21),
    // bundle compatibility (#23).
    expect([...gaps].sort((a, b) => a - b)).toEqual([1, 6, 7, 8, 21, 23]);
  });
});
