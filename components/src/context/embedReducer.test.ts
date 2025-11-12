import { describe, expect, it } from "vitest";

import { reducer } from "./embedReducer";
import { initialState } from "./embedState";
import type { BypassConfig } from "./embedState";

describe("embedReducer - SET_PLANID_BYPASS", () => {
  describe("Legacy String Mode", () => {
    it("should bypass plan selection when given a string planId", () => {
      const result = reducer(initialState, {
        type: "SET_PLANID_BYPASS",
        config: "plan_xyz123",
      });

      expect(result.layout).toBe("checkout");
      expect(result.checkoutState).toEqual({
        planId: "plan_xyz123",
        bypassPlanSelection: true,
        bypassAddOnSelection: false,
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
      expect(result.checkoutState).toEqual({
        planId: "plan_abc",
        bypassPlanSelection: false,
        bypassAddOnSelection: false,
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

      expect(result.checkoutState).toEqual({
        planId: "plan_abc",
        addOnIds: ["addon_1", "addon_2"],
        bypassPlanSelection: false,
        bypassAddOnSelection: false,
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

      expect(result.checkoutState).toEqual({
        bypassPlanSelection: true,
        bypassAddOnSelection: false,
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
});
