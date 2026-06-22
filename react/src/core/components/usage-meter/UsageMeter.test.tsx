import { render } from "@testing-library/react";
import { vi } from "vitest";

import { UsageMeter } from "./UsageMeter";

import { type UsageMeterData } from "@schematichq/schematic-react";

const { mockUseUsageMeter } = vi.hoisted(() => ({
  mockUseUsageMeter: vi.fn(),
}));

// The styled wrapper composes the headless `Root`, which sources data from
// the core `useUsageMeter` hook via the package self-specifier. Stub just that
// hook so we assert the wrapper's DOM/behavior in isolation.
vi.mock("@schematichq/schematic-react", async (importActual) => {
  const actual =
    await importActual<typeof import("@schematichq/schematic-react")>();
  return { ...actual, useUsageMeter: mockUseUsageMeter };
});

function setData(data: UsageMeterData) {
  mockUseUsageMeter.mockReturnValue(data);
}

describe("UsageMeter (default-styled wrapper)", () => {
  beforeEach(() => mockUseUsageMeter.mockReset());

  it("renders the meter DOM with the legacy attributes and classNames", () => {
    setData({
      flag: "seats",
      usage: 42,
      allocation: 100,
      percent: 42,
      hasData: true,
    });
    const { getByRole } = render(<UsageMeter flag="seats" className="mine" />);

    const track = getByRole("meter");
    expect(track.id).toBe("seats");
    expect(track.getAttribute("data-schematic")).toBe("usage-meter");
    expect(track.className).toBe("schematic-usage-meter mine");
    expect(track.getAttribute("aria-valuenow")).toBe("42");
    expect(track.getAttribute("aria-valuemax")).toBe("100");
    // Composed from the headless layer, so the part hook comes along for free.
    expect(track.getAttribute("data-schematic-part")).toBe("track");

    const fill = track.querySelector(
      '[data-schematic="usage-meter-fill"]',
    ) as HTMLElement;
    expect(fill).not.toBeNull();
    expect(fill.className).toBe("schematic-usage-meter__fill");
    expect(fill.style.width).toBe("42%");
  });

  it("renders nothing when usage/allocation are unavailable", () => {
    setData({
      flag: "seats",
      usage: undefined,
      allocation: undefined,
      percent: 0,
      hasData: false,
    });
    const { container } = render(<UsageMeter flag="seats" />);
    expect(container.firstChild).toBeNull();
  });
});
