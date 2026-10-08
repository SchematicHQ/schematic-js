import { renderHook } from "@testing-library/react";
import { vi } from "vitest";

import { useTranslator } from "./common";

describe("useTranslator", () => {
  test("warns once when copy gets a raw number, but not for count", () => {
    const warn = vi.mocked(console.warn).mockImplementationOnce(() => {});
    const { result } = renderHook(() => useTranslator());
    expect(result.current("usageUsed", { amount: 10000, units: "x" })).toBe(
      "10000 x used",
    );
    result.current("usageUsed", { amount: 10000, units: "x" });
    result.current("upcomingBillDiscountRepeating", {
      count: 3,
      value: "10%",
    });
    expect(warn).toHaveBeenCalledTimes(1);
    expect(warn).toHaveBeenCalledWith(
      expect.stringContaining('"usageUsed" got a raw number for "amount"'),
    );
  });
});
