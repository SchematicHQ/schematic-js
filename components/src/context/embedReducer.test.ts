import { describe, expect, it } from "vitest";

import { reducer } from "./embedReducer";
import type { BypassConfig } from "./embedState";
import { initialState } from "./embedState";

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
