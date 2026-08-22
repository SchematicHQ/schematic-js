import { describe, expect, it } from "vitest";

import type { PaymentMethodResponseData } from "../api/checkoutexternal";
import type { HydrateDataWithCompanyContext } from "../types";

import { reducer } from "./embedReducer";
import { initialState, type BypassConfig, type EmbedState } from "./embedState";

describe("embedReducer - SET_PLANID_BYPASS", () => {
  describe("Legacy String Mode", () => {
    it("should bypass plan selection when given a string planId", () => {
      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config: "plan_xyz123",
      });

      expect(result.layout).toBe("checkout");
      expect(result.checkoutState).toMatchObject({
        planId: "plan_xyz123",
        bypassPlanSelection: true,
        bypassAddOnSelection: false,
        bypassCreditsSelection: false,
        hideSkippedStages: false,
      });
    });
  });

  describe("Pre-Selection Mode (object without skipped)", () => {
    it("should show all stages with pre-selected plan", () => {
      const config: BypassConfig = {
        planId: "plan_abc",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.layout).toBe("checkout");
      expect(result.checkoutState).toMatchObject({
        planId: "plan_abc",
        bypassPlanSelection: false,
        bypassAddOnSelection: false,
        bypassCreditsSelection: false,
        hideSkippedStages: false,
      });
    });

    it("should pre-select plan and add-ons without skipping stages", () => {
      const config: BypassConfig = {
        planId: "plan_abc",
        addOnIds: ["addon_1", "addon_2"],
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        planId: "plan_abc",
        addOnIds: ["addon_1", "addon_2"],
        bypassPlanSelection: false,
        bypassAddOnSelection: false,
        bypassCreditsSelection: false,
        hideSkippedStages: false,
      });
    });
  });

  describe("Explicit Skip Mode (object with skipped)", () => {
    it("should skip only plan stage when planStage is true", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        skipped: { planStage: true },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        planId: "plan_xyz",
        bypassPlanSelection: true,
        bypassAddOnSelection: false,
      });
    });

    it("should skip both stages when both flags are true", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        addOnIds: ["addon_1"],
        skipped: {
          planStage: true,
          addOnStage: true,
        },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        planId: "plan_xyz",
        addOnIds: ["addon_1"],
        bypassPlanSelection: true,
        bypassAddOnSelection: true,
      });
    });

    it("should show plan stage but skip add-on stage", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        skipped: {
          planStage: false,
          addOnStage: true,
        },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        planId: "plan_xyz",
        bypassPlanSelection: false,
        bypassAddOnSelection: true,
      });
    });

    it("should skip credits stage when creditStage is true", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        skipped: { creditStage: true },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        planId: "plan_xyz",
        bypassPlanSelection: false,
        bypassAddOnSelection: false,
        bypassCreditsSelection: true,
      });
    });

    it("should skip all stages when all flags are true", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        skipped: {
          planStage: true,
          addOnStage: true,
          creditStage: true,
        },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        planId: "plan_xyz",
        bypassPlanSelection: true,
        bypassAddOnSelection: true,
        bypassCreditsSelection: true,
      });
    });
  });

  describe("Optional planId", () => {
    it("should work without planId when using explicit skip config", () => {
      const config: BypassConfig = {
        skipped: { planStage: true },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        bypassPlanSelection: true,
        bypassAddOnSelection: false,
        bypassCreditsSelection: false,
        hideSkippedStages: false,
      });
      expect(result.checkoutState?.planId).toBeUndefined();
    });
  });

  describe("hideSkipped configuration", () => {
    it("should set hideSkippedStages flag when hideSkipped is true", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        skipped: { planStage: true },
        hideSkipped: true,
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.hideSkippedStages).toBe(true);
    });

    it("should default hideSkippedStages to false", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.hideSkippedStages).toBe(false);
    });
  });

  describe("startTrialIfAvailable configuration", () => {
    it("should default startTrialIfAvailable to true", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.startTrialIfAvailable).toBe(true);
    });

    it("should default startTrialIfAvailable to true for legacy string format", () => {
      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config: "plan_xyz",
      });

      expect(result.checkoutState?.startTrialIfAvailable).toBe(true);
    });

    it("should respect startTrialIfAvailable: false when explicitly set", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        startTrialIfAvailable: false,
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.startTrialIfAvailable).toBe(false);
    });
  });

  describe("Period configuration", () => {
    it("should set period when provided", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        period: "year",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        planId: "plan_xyz",
        period: "year",
      });
    });

    it("should not set period when not provided", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.period).toBeUndefined();
    });
  });

  describe("Currency Configuration", () => {
    it("should pre-select the currency, uppercased", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        currency: "eur",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.selectedCurrency).toBe("EUR");
    });

    it("should not set selectedCurrency when currency is not provided", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.selectedCurrency).toBeUndefined();
    });

    it("should carry showCurrencySelector through when set to false", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        currency: "EUR",
        showCurrencySelector: false,
        skipped: { planStage: true },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.showCurrencySelector).toBe(false);
      expect(result.checkoutState?.selectedCurrency).toBe("EUR");
      expect(result.checkoutState?.bypassPlanSelection).toBe(true);
    });

    it("should leave showCurrencySelector undefined when not provided", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.showCurrencySelector).toBeUndefined();
    });
  });

  describe("showBillingDisclaimer configuration", () => {
    it("should carry showBillingDisclaimer through when set to false", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        showBillingDisclaimer: false,
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.showBillingDisclaimer).toBe(false);
    });

    it("should leave showBillingDisclaimer undefined when not provided", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.showBillingDisclaimer).toBeUndefined();
    });
  });

  describe("Usage stage skip configuration", () => {
    it("should skip the usage stages when explicitly configured", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        skipped: {
          usageStage: true,
          addOnUsageStage: true,
        },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        bypassUsageSelection: true,
        bypassAddOnUsageSelection: true,
      });
    });

    it("should default usage bypass flags to false in explicit skip mode", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        skipped: { planStage: true },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        bypassUsageSelection: false,
        bypassAddOnUsageSelection: false,
      });
    });

    it("should default usage bypass flags to false in pre-selection mode", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState).toMatchObject({
        bypassUsageSelection: false,
        bypassAddOnUsageSelection: false,
      });
    });

    it("should default usage bypass flags to false for legacy string format", () => {
      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config: "plan_xyz",
      });

      expect(result.checkoutState).toMatchObject({
        bypassUsageSelection: false,
        bypassAddOnUsageSelection: false,
      });
    });
  });

  describe("payInAdvanceQuantities configuration", () => {
    it("should pass payInAdvanceQuantities through verbatim", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        payInAdvanceQuantities: { feat_seats: 3, feat_api: 2 },
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.payInAdvanceQuantities).toEqual({
        feat_seats: 3,
        feat_api: 2,
      });
    });

    it("should leave payInAdvanceQuantities undefined when not provided", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.payInAdvanceQuantities).toBeUndefined();
    });
  });

  describe("promoCode configuration", () => {
    it("should pass promoCode through verbatim", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        promoCode: "SUMMER20",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.promoCode).toBe("SUMMER20");
    });

    it("should leave promoCode undefined when not provided", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.promoCode).toBeUndefined();
    });

    it("should not set promoCode for an empty string", () => {
      const config: BypassConfig = {
        planId: "plan_xyz",
        promoCode: "",
      };

      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config,
      });

      expect(result.checkoutState?.promoCode).toBeUndefined();
    });
  });
});

describe("embedReducer - normalize on already-hydrated data", () => {
  // normalize() re-runs on hydrated state for payment-method and custom-field
  // updates; its defaults must not override settings the server sent (saving
  // a payment method once unmounted the tax-ID field this way).
  it("keeps server checkout settings when a payment method is saved", () => {
    const data = {
      activePlans: [],
      activeAddOns: [],
      checkoutSettings: {
        collectAddress: true,
        collectEmail: true,
        collectPhone: false,
        collectTaxId: true,
        prorationBehavior: "create_prorations",
        taxCollectionEnabled: true,
      },
      customCheckoutFields: [],
    } as unknown as HydrateDataWithCompanyContext;

    const result = reducer(
      { ...initialState, data },
      {
        type: "UPDATE_PAYMENT_METHOD",
        paymentMethod: { id: "pm_123" } as PaymentMethodResponseData,
      },
    );

    expect(result.data?.checkoutSettings).toMatchObject({
      collectAddress: true,
      collectEmail: true,
      collectPhone: false,
      collectTaxId: true,
      taxCollectionEnabled: true,
    });
  });

  it("still fills defaults for payloads without checkout settings", () => {
    const data = {
      activePlans: [],
      activeAddOns: [],
    } as unknown as HydrateDataWithCompanyContext;

    const result = reducer(
      { ...initialState, data },
      {
        type: "UPDATE_PAYMENT_METHOD",
        paymentMethod: { id: "pm_123" } as PaymentMethodResponseData,
      },
    );

    expect(result.data?.checkoutSettings).toMatchObject({
      collectAddress: false,
      collectEmail: false,
      collectPhone: false,
      collectTaxId: false,
      taxCollectionEnabled: false,
    });
    expect(result.data?.customCheckoutFields).toEqual([]);
  });
});

describe("embedReducer - SET_CHECKOUT_PREFILL", () => {
  it("should set the checkout prefill", () => {
    const result = reducer(initialState, {
      type: "SET_CHECKOUT_PREFILL",
      checkoutPrefill: {
        billingDetails: { email: "a@b.com", name: "Ada Lovelace" },
      },
    });

    expect(result.checkoutPrefill).toEqual({
      billingDetails: { email: "a@b.com", name: "Ada Lovelace" },
    });
  });

  it("should replace an existing prefill", () => {
    const seeded = reducer(initialState, {
      type: "SET_CHECKOUT_PREFILL",
      checkoutPrefill: { billingDetails: { email: "a@b.com" } },
    });

    const result = reducer(seeded, {
      type: "SET_CHECKOUT_PREFILL",
      checkoutPrefill: { billingDetails: { name: "Grace Hopper" } },
    });

    expect(result.checkoutPrefill).toEqual({
      billingDetails: { name: "Grace Hopper" },
    });
  });

  it("should clear the prefill when set to undefined", () => {
    const seeded = reducer(initialState, {
      type: "SET_CHECKOUT_PREFILL",
      checkoutPrefill: { billingDetails: { email: "a@b.com" } },
    });

    const result = reducer(seeded, {
      type: "SET_CHECKOUT_PREFILL",
      checkoutPrefill: undefined,
    });

    expect(result.checkoutPrefill).toBeUndefined();
  });
});

describe("embedReducer - checkoutSettings are preserved across re-normalize", () => {
  const hydrated = {
    ...initialState,
    data: {
      activePlans: [],
      activeAddOns: [],
      checkoutSettings: {
        bundlePurchaseBehavior: "individual",
        collectAddress: true,
        collectEmail: true,
        collectPhone: true,
        collectTaxId: true,
        prorationBehavior: "invoice_immediately",
        taxCollectionEnabled: true,
      },
    },
  } as unknown as typeof initialState;

  it("keeps the hydrated settings when a payment method is updated", () => {
    const result = reducer(hydrated, {
      type: "UPDATE_PAYMENT_METHOD",
      paymentMethod: { id: "pm_1" },
    } as never);

    expect(result.data?.checkoutSettings).toMatchObject({
      bundlePurchaseBehavior: "individual",
      collectTaxId: true,
      prorationBehavior: "invoice_immediately",
      taxCollectionEnabled: true,
    });
  });

  it("keeps the hydrated settings when custom field values change", () => {
    const result = reducer(hydrated, {
      type: "UPDATE_CUSTOM_FIELD_VALUES",
      values: { field: "value" },
    } as never);

    expect(result.data?.checkoutSettings.bundlePurchaseBehavior).toBe(
      "individual",
    );
  });
});

describe("embedReducer - UPDATE_SETTINGS", () => {
  // What the consuming app asks for at runtime, e.g. to follow its own dark mode.
  const consumerTheme = { theme: { card: { background: "#111111" } } };
  // What the dashboard stores. This is a *complete* theme, which is why a plain
  // last-writer-wins merge used to erase everything the consumer had set.
  const builderTheme = {
    theme: { card: { background: "#FFFFFF" }, primary: "#AABBCC" },
  };

  const applyConsumer = (state: EmbedState, settings = consumerTheme) =>
    reducer(state, {
      type: "UPDATE_SETTINGS",
      settings,
      update: true,
      source: "consumer" as const,
    });

  const applyBuilder = (state: EmbedState) =>
    reducer(state, {
      type: "UPDATE_SETTINGS",
      settings: builderTheme,
      update: true,
      source: "builder" as const,
    });

  it("keeps consumer settings when the stored design arrives afterwards", () => {
    const result = applyBuilder(applyConsumer(initialState));

    expect(result.settings.theme.card.background).toBe("#111111");
  });

  it("applies stored design values the consumer did not set", () => {
    const result = applyBuilder(applyConsumer(initialState));

    expect(result.settings.theme.primary).toBe("#AABBCC");
  });

  it("resolves the same way regardless of arrival order", () => {
    const builderFirst = applyConsumer(applyBuilder(initialState));
    const consumerFirst = applyBuilder(applyConsumer(initialState));

    expect(builderFirst.settings).toEqual(consumerFirst.settings);
  });

  it("keeps consumer settings when the stored design is re-applied", () => {
    // Re-hydration (after a checkout or unsubscribe) replays the builder update.
    const result = applyBuilder(applyBuilder(applyConsumer(initialState)));

    expect(result.settings.theme.card.background).toBe("#111111");
  });

  it("lets a later consumer update override an earlier one", () => {
    const result = applyConsumer(applyBuilder(applyConsumer(initialState)), {
      theme: { card: { background: "#222222" } },
    });

    expect(result.settings.theme.card.background).toBe("#222222");
  });

  it("ranks an unsourced update below both sources", () => {
    // The provider's `prefers-color-scheme` listener dispatches without a source.
    const withSystem = reducer(initialState, {
      type: "UPDATE_SETTINGS",
      settings: { theme: { colorMode: "dark", primary: "#333333" } },
      update: true,
    });
    const result = applyBuilder(applyConsumer(withSystem));

    expect(result.settings.theme.primary).toBe("#AABBCC");
    // …but it still contributes where nothing else does.
    expect(result.settings.theme.colorMode).toBe("dark");
  });

  it("replaces the consumer layer and the stored design without `update`", () => {
    const seeded = applyBuilder(applyConsumer(initialState));

    const result = reducer(seeded, {
      type: "UPDATE_SETTINGS",
      settings: { theme: { card: { background: "#222222" } } },
      source: "consumer",
    });

    expect(result.settings.theme.card.background).toBe("#222222");
    // The stored design's other values are discarded, back to the defaults.
    expect(result.settings.theme.primary).toBe(
      initialState.settings.theme.primary,
    );
  });

  it("merges into the existing consumer values with `update`", () => {
    const seeded = applyConsumer(initialState);

    const result = applyConsumer(seeded, {
      theme: { card: { background: "#222222" } },
    });

    expect(result.settings.theme.card.background).toBe("#222222");
    expect(result.settings.theme.card.padding).toBe(
      initialState.settings.theme.card.padding,
    );
  });
});
