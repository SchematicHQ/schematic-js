import { renderHook } from "@testing-library/react";
import { vi } from "vitest";

import { DEFAULT_CURRENCY } from "../const";

import {
  useAvailableCurrencies,
  useAvailableCurrenciesWithInvalid,
} from "./useAvailableCurrencies";

const mockUseEmbed = vi.fn();

vi.mock("./useEmbed", () => ({
  useEmbed: (...args: unknown[]) => mockUseEmbed(...args),
}));

type MockCp = { currency: string };
type MockPlan = {
  currencyPrices?: MockCp[];
  monthlyPrice?: { currency: string };
  yearlyPrice?: { currency: string };
  oneTimePrice?: { currency: string };
};

function setupEmbed({
  activePlans = [],
  activeAddOns = [],
  currencyFilter,
}: {
  activePlans?: MockPlan[];
  activeAddOns?: MockPlan[];
  currencyFilter?: string[];
} = {}) {
  mockUseEmbed.mockReturnValue({
    data: { activePlans, activeAddOns },
    currencyFilter,
    debug: () => {},
  });
}

beforeEach(() => {
  mockUseEmbed.mockReset();
});

describe("useAvailableCurrencies", () => {
  test("uses the first plan's stored order as the prefix", () => {
    setupEmbed({
      activePlans: [
        {
          currencyPrices: [
            { currency: "JPY" },
            { currency: "USD" },
            { currency: "CAD" },
          ],
        },
      ],
    });

    const { result } = renderHook(() => useAvailableCurrencies());
    expect(result.current).toEqual(["JPY", "USD", "CAD"]);
  });

  test("alphabetizes leftover currencies from later plans and add-ons", () => {
    setupEmbed({
      activePlans: [
        // First plan: prefix
        { currencyPrices: [{ currency: "JPY" }, { currency: "USD" }] },
        // Other plan: contributes EUR (new) and USD (already covered)
        { currencyPrices: [{ currency: "EUR" }, { currency: "USD" }] },
      ],
      // Add-on: contributes CAD (new) and AUD (new)
      activeAddOns: [
        { currencyPrices: [{ currency: "CAD" }, { currency: "AUD" }] },
      ],
    });

    const { result } = renderHook(() => useAvailableCurrencies());
    // Prefix from plan 0, then leftovers alphabetically
    expect(result.current).toEqual(["JPY", "USD", "AUD", "CAD", "EUR"]);
  });

  test("normalizes currency codes to upper case", () => {
    setupEmbed({
      activePlans: [
        { currencyPrices: [{ currency: "jpy" }, { currency: "usd" }] },
      ],
      activeAddOns: [{ currencyPrices: [{ currency: "eur" }] }],
    });

    const { result } = renderHook(() => useAvailableCurrencies());
    expect(result.current).toEqual(["JPY", "USD", "EUR"]);
  });

  test("falls back to legacy interval prices when first plan has no currencyPrices", () => {
    setupEmbed({
      activePlans: [
        // Legacy single-currency plan
        {
          currencyPrices: [],
          monthlyPrice: { currency: "EUR" },
          yearlyPrice: { currency: "EUR" },
        },
        { currencyPrices: [{ currency: "USD" }, { currency: "CAD" }] },
      ],
    });

    const { result } = renderHook(() => useAvailableCurrencies());
    expect(result.current).toEqual(["EUR", "CAD", "USD"]);
  });

  test("does not pin DEFAULT_CURRENCY when other currencies are present", () => {
    setupEmbed({
      activePlans: [
        { currencyPrices: [{ currency: "JPY" }, { currency: "CAD" }] },
      ],
    });

    const { result } = renderHook(() => useAvailableCurrencies());
    // Even though USD is the DEFAULT_CURRENCY, it doesn't appear because
    // no plan offers it.
    expect(result.current).toEqual(["JPY", "CAD"]);
  });

  test("falls back to DEFAULT_CURRENCY when nothing is hydrated", () => {
    setupEmbed({});

    const { result } = renderHook(() => useAvailableCurrencies());
    expect(result.current).toEqual([DEFAULT_CURRENCY]);
  });

  test("preserves currencyFilter input order without re-sorting", () => {
    setupEmbed({
      activePlans: [
        {
          currencyPrices: [
            { currency: "JPY" },
            { currency: "USD" },
            { currency: "EUR" },
            { currency: "CAD" },
          ],
        },
      ],
      // Integrator picked a deliberate non-alphabetical order
      currencyFilter: ["EUR", "JPY", "USD"],
    });

    const { result } = renderHook(() => useAvailableCurrencies());
    expect(result.current).toEqual(["EUR", "JPY", "USD"]);
  });

  test("currencyFilter matches case-insensitively", () => {
    // Currency codes round-trip through the API as lowercase. Lowercase ("usd") should 
    // still match the hydrated uppercase set without falling into invalidFilterEntries.
    setupEmbed({
      activePlans: [
        {
          currencyPrices: [{ currency: "USD" }, { currency: "EUR" }],
        },
      ],
      currencyFilter: ["eur", "usd"],
    });

    const { result } = renderHook(() => useAvailableCurrenciesWithInvalid());
    expect(result.current.currencies).toEqual(["EUR", "USD"]);
    expect(result.current.invalidFilterEntries).toEqual([]);
  });

  test("currencyFilter reports invalid entries", () => {
    setupEmbed({
      activePlans: [{ currencyPrices: [{ currency: "USD" }] }],
      currencyFilter: ["USD", "ZZZ"],
    });
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { result } = renderHook(() => useAvailableCurrenciesWithInvalid());
    expect(result.current.currencies).toEqual(["USD"]);
    expect(result.current.invalidFilterEntries).toEqual(["ZZZ"]);

    consoleError.mockRestore();
  });
});
