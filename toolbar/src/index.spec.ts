import { vi, describe, it, expect, beforeEach, afterEach } from "vitest";
import { DeveloperToolbar } from "./index";
import type { CheckFlagReturn } from "@schematichq/schematic-js";
import type { DeveloperToolbarDependencies } from "./index";

function makeDeps(): DeveloperToolbarDependencies {
  return {
    getAllFlags: vi.fn(() => ({})),
    getFlagValue: vi.fn(() => undefined),
    addFlagValueListener: vi.fn(() => vi.fn()),
    notifyFlagCheckListeners: vi.fn(),
    notifyFlagValueListeners: vi.fn(),
  };
}

describe("DeveloperToolbar", () => {
  let deps: DeveloperToolbarDependencies;
  let toolbar: DeveloperToolbar;

  beforeEach(() => {
    deps = makeDeps();
    toolbar = new DeveloperToolbar(deps);
  });

  afterEach(() => {
    toolbar.cleanup();
    vi.unstubAllGlobals();
  });

  describe("initialize()", () => {
    it("appends #schematic-developer-toolbar to document.body", () => {
      toolbar.initialize();
      expect(document.getElementById("schematic-developer-toolbar")).not.toBeNull();
    });

    it("sets document.body.style.paddingTop to 45px", () => {
      toolbar.initialize();
      expect(document.body.style.paddingTop).toBe("45px");
    });

    it("is idempotent: calling twice does not create duplicate elements", () => {
      toolbar.initialize();
      toolbar.initialize();
      const elements = document.querySelectorAll("#schematic-developer-toolbar");
      expect(elements).toHaveLength(1);
    });

    it("does nothing when window is undefined (SSR guard)", () => {
      vi.stubGlobal("window", undefined);
      toolbar.initialize();
      expect(document.getElementById("schematic-developer-toolbar")).toBeNull();
    });

    it("calls getAllFlags to populate the flag dropdown", () => {
      toolbar.initialize();
      expect(deps.getAllFlags).toHaveBeenCalled();
    });
  });

  describe("cleanup()", () => {
    it("removes #schematic-developer-toolbar from DOM", () => {
      toolbar.initialize();
      toolbar.cleanup();
      expect(document.getElementById("schematic-developer-toolbar")).toBeNull();
    });

    it("resets document.body.style.paddingTop to empty string", () => {
      toolbar.initialize();
      toolbar.cleanup();
      expect(document.body.style.paddingTop).toBe("");
    });

    it("calls the unsubscribe function returned by addFlagValueListener", () => {
      const unsubscribe = vi.fn();
      (deps.addFlagValueListener as ReturnType<typeof vi.fn>).mockReturnValue(unsubscribe);
      toolbar.initialize();
      toolbar.cleanup();
      expect(unsubscribe).toHaveBeenCalled();
    });

    it("clears manualOverrides so getAllManualOverrides returns {}", () => {
      toolbar.setManualOverride("my-flag", true);
      toolbar.cleanup();
      expect(toolbar.getAllManualOverrides()).toEqual({});
    });
  });

  describe("setManualOverride()", () => {
    it("stores a true override with the correct shape", () => {
      toolbar.setManualOverride("my-flag", true);
      expect(toolbar.getManualOverride("my-flag")).toEqual({
        flag: "my-flag",
        value: true,
        reason: "Developer toolbar override",
      });
    });

    it("stores a false override correctly", () => {
      toolbar.setManualOverride("my-flag", false);
      expect(toolbar.getManualOverride("my-flag")).toEqual({
        flag: "my-flag",
        value: false,
        reason: "Developer toolbar override",
      });
    });

    it("calls notifyFlagCheckListeners with the override object", () => {
      toolbar.setManualOverride("my-flag", true);
      expect(deps.notifyFlagCheckListeners).toHaveBeenCalledWith("my-flag", {
        flag: "my-flag",
        value: true,
        reason: "Developer toolbar override",
      });
    });

    it("calls notifyFlagValueListeners with the boolean value", () => {
      toolbar.setManualOverride("my-flag", true);
      expect(deps.notifyFlagValueListeners).toHaveBeenCalledWith("my-flag", true);
    });

    it("overwrites an existing override with the new value", () => {
      toolbar.setManualOverride("my-flag", true);
      toolbar.setManualOverride("my-flag", false);
      expect(toolbar.getManualOverride("my-flag")?.value).toBe(false);
    });
  });

  describe("getManualOverride()", () => {
    it("returns undefined for an unknown flagKey", () => {
      expect(toolbar.getManualOverride("nonexistent")).toBeUndefined();
    });

    it("returns the stored CheckFlagReturn after setManualOverride", () => {
      toolbar.setManualOverride("my-flag", true);
      const override = toolbar.getManualOverride("my-flag");
      expect(override).toEqual<CheckFlagReturn>({
        flag: "my-flag",
        value: true,
        reason: "Developer toolbar override",
      });
    });
  });

  describe("hasManualOverride()", () => {
    it("returns false for an unknown flagKey", () => {
      expect(toolbar.hasManualOverride("nonexistent")).toBe(false);
    });

    it("returns true after setManualOverride", () => {
      toolbar.setManualOverride("my-flag", true);
      expect(toolbar.hasManualOverride("my-flag")).toBe(true);
    });

    it("returns false after cleanup clears overrides", () => {
      toolbar.setManualOverride("my-flag", true);
      toolbar.cleanup();
      expect(toolbar.hasManualOverride("my-flag")).toBe(false);
    });
  });

  describe("getAllManualOverrides()", () => {
    it("returns {} when no overrides are set", () => {
      expect(toolbar.getAllManualOverrides()).toEqual({});
    });

    it("returns all overrides across multiple flags", () => {
      toolbar.setManualOverride("flag-a", true);
      toolbar.setManualOverride("flag-b", false);
      const overrides = toolbar.getAllManualOverrides();
      expect(overrides["flag-a"]?.value).toBe(true);
      expect(overrides["flag-b"]?.value).toBe(false);
    });

    it("returns a shallow copy, not the live reference", () => {
      toolbar.setManualOverride("flag-a", true);
      const overrides = toolbar.getAllManualOverrides();
      // Mutate the returned copy
      delete overrides["flag-a"];
      // Internal state should be unchanged
      expect(toolbar.hasManualOverride("flag-a")).toBe(true);
    });
  });
});
