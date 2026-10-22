import { render, renderHook } from "@testing-library/react";
import { vi } from "vitest";

import { Icon, useTranslator } from "./common";

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

describe("Icon", () => {
  test("draws a schematic-icons glyph by name", () => {
    const { container } = render(<Icon className="x" name="server-search" />);
    expect(container.firstElementChild).toMatchObject({ tagName: "I" });
    expect(container.firstElementChild).toHaveClass(
      "schematic-icon",
      "schematic-icon--server-search",
      "x",
    );
  });

  test("draws anything else, an emoji, as its text", () => {
    const { container } = render(<Icon className="x" name="🚀" />);
    const node = container.firstElementChild;
    expect(node).toMatchObject({ tagName: "SPAN", textContent: "🚀" });
    expect(node).toHaveClass("schematic-icon-text", "x");
    expect(node?.className).not.toContain("schematic-icon--");
    expect(node).toHaveAttribute("aria-hidden", "true");
  });
});
