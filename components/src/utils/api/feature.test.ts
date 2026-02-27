import type { FeatureDetailResponseData } from "../../api/checkoutexternal";

import { getFeatureName } from "./feature";

type FeaturePick = Pick<
  FeatureDetailResponseData,
  "name" | "singularName" | "pluralName"
>;

describe("getFeatureName", () => {
  describe("without ignore parameter", () => {
    it("should return pluralName when count is 0 (default)", () => {
      const feature: FeaturePick = {
        name: "API Call",
        singularName: "API Call",
        pluralName: "API Calls",
      };

      expect(getFeatureName(feature)).toBe("API Calls");
    });

    it("should return pluralName when count > 1", () => {
      const feature: FeaturePick = {
        name: "API Call",
        singularName: "API Call",
        pluralName: "API Calls",
      };

      expect(getFeatureName(feature, 5)).toBe("API Calls");
    });

    it("should return singularName when count is 1", () => {
      const feature: FeaturePick = {
        name: "API Call",
        singularName: "API Call",
        pluralName: "API Calls",
      };

      expect(getFeatureName(feature, 1)).toBe("API Call");
    });

    it("should pluralize singularName when pluralName is not set and count > 1", () => {
      const feature: FeaturePick = {
        name: "API Call",
        singularName: "Request",
        pluralName: null,
      };

      expect(getFeatureName(feature, 5)).toBe("Requests");
    });

    it("should return singularName as-is when count is 1 and pluralName is not set", () => {
      const feature: FeaturePick = {
        name: "API Call",
        singularName: "Request",
        pluralName: null,
      };

      expect(getFeatureName(feature, 1)).toBe("Request");
    });

    it("should fall back to pluralized name when both singularName and pluralName are null", () => {
      const feature: FeaturePick = {
        name: "seat",
        singularName: null,
        pluralName: null,
      };

      expect(getFeatureName(feature, 5)).toBe("seats");
    });

    it("should fall back to name singularized when count is 1 and singular/plural names are null", () => {
      const feature: FeaturePick = {
        name: "seats",
        singularName: null,
        pluralName: null,
      };

      expect(getFeatureName(feature, 1)).toBe("seat");
    });
  });

  describe("with ignore parameter set to true", () => {
    it("should ignore pluralName and use pluralized name instead when count > 1", () => {
      const feature: FeaturePick = {
        name: "API Call",
        singularName: "API Call",
        pluralName: "Custom Plural Name",
      };

      const result = getFeatureName(feature, 5, true);
      expect(result).not.toBe("Custom Plural Name");
      expect(result).toBe("API Calls");
    });

    it("should ignore singularName and use name instead when count is 1", () => {
      const feature: FeaturePick = {
        name: "Call",
        singularName: "Custom Singular Name",
        pluralName: "Custom Plural Name",
      };

      const result = getFeatureName(feature, 1, true);
      expect(result).not.toBe("Custom Singular Name");
      expect(result).toBe("Call");
    });

    it("should ignore pluralName and pluralize name when count is 0", () => {
      const feature: FeaturePick = {
        name: "seat",
        singularName: "Custom Seat",
        pluralName: "Custom Seats",
      };

      const result = getFeatureName(feature, 0, true);
      expect(result).not.toBe("Custom Seats");
      expect(result).toBe("seats");
    });

    it("should still use name fallback when ignore is true and all custom names are null", () => {
      const feature: FeaturePick = {
        name: "Widget",
        singularName: null,
        pluralName: null,
      };

      expect(getFeatureName(feature, 5, true)).toBe("Widgets");
      expect(getFeatureName(feature, 1, true)).toBe("Widget");
    });
  });

  describe("with ignore parameter set to false (explicit)", () => {
    it("should behave identically to default (no ignore param)", () => {
      const feature: FeaturePick = {
        name: "API Call",
        singularName: "API Call",
        pluralName: "API Calls",
      };

      expect(getFeatureName(feature, 5, false)).toBe("API Calls");
      expect(getFeatureName(feature, 1, false)).toBe("API Call");
      expect(getFeatureName(feature, 0, false)).toBe("API Calls");
    });
  });

  describe("edge cases", () => {
    it("should handle empty name string", () => {
      const feature: FeaturePick = {
        name: "",
        singularName: null,
        pluralName: null,
      };

      const result = getFeatureName(feature, 0);
      expect(typeof result).toBe("string");
    });

    it("should prioritize pluralName over singularName for plural contexts", () => {
      const feature: FeaturePick = {
        name: "item",
        singularName: "piece",
        pluralName: "pieces",
      };

      expect(getFeatureName(feature, 2)).toBe("pieces");
    });

    it("should use singularName for singular context even when pluralName exists", () => {
      const feature: FeaturePick = {
        name: "item",
        singularName: "piece",
        pluralName: "pieces",
      };

      expect(getFeatureName(feature, 1)).toBe("piece");
    });

    it("should ignore user-set singularName and pluralName when ignore is true, falling back to name-based pluralization", () => {
      const feature: FeaturePick = {
        name: "mouse",
        singularName: "Custom Mouse",
        pluralName: "Custom Mice",
      };

      const pluralResult = getFeatureName(feature, 2, true);
      expect(pluralResult).not.toBe("Custom Mice");
      expect(pluralResult).toBe("mice");

      const singularResult = getFeatureName(feature, 1, true);
      expect(singularResult).not.toBe("Custom Mouse");
      expect(singularResult).toBe("mouse");
    });
  });
});
