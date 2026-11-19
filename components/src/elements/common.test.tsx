import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { vi } from "vitest";

import {
  Icon,
  Tooltip,
  tooltipBounds,
  tooltipPosition,
  useTranslator,
} from "./common";

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
    expect(node).toMatchObject({ tagName: "I", textContent: "🚀" });
    expect(node).toHaveClass("schematic-icon", "x");
    expect(node?.className).not.toContain("schematic-icon--");
    expect(node).toHaveAttribute("aria-hidden", "true");
  });
});

describe("Tooltip", () => {
  test("describes an info glyph by default and opens above", () => {
    const { container } = render(
      <Tooltip label="About limits">Hard cap</Tooltip>,
    );
    const glyph = screen.getByRole("button", { name: "About limits" });
    expect(glyph).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
    expect(container.firstElementChild).toHaveAttribute(
      "data-placement",
      "top",
    );
  });

  test("describes the caller's trigger and opens below on request", () => {
    const { container } = render(
      <Tooltip
        placement="bottom"
        trigger={(describedBy) => (
          <a aria-describedby={describedBy} href="/billing">
            Balance
          </a>
        )}
      >
        Resets Sep 1
      </Tooltip>,
    );
    expect(screen.getByRole("link", { name: "Balance" })).toHaveAttribute(
      "aria-describedby",
      screen.getByRole("tooltip").id,
    );
    expect(screen.queryByRole("button")).toBeNull();
    expect(container.firstElementChild).toHaveAttribute(
      "data-placement",
      "bottom",
    );
  });
});

describe("tooltipPosition", () => {
  const viewport = { width: 1000, height: 800 };
  const size = { width: 300, height: 80 };
  const at = (left: number, top: number) => ({
    top,
    bottom: top + 36,
    left,
    right: left + 200,
  });
  const prefer = { side: "top", align: "end" } as const;

  test("keeps the preferred side and edge when they fit", () => {
    expect(tooltipPosition(at(400, 400), size, viewport, prefer)).toEqual(
      prefer,
    );
  });

  test("flips below near the top and to the start edge near the left", () => {
    expect(tooltipPosition(at(20, 10), size, viewport, prefer)).toEqual({
      side: "bottom",
      align: "start",
    });
  });

  test("flips above near the bottom when it prefers below", () => {
    expect(
      tooltipPosition(at(400, 740), size, viewport, {
        side: "bottom",
        align: "end",
      }).side,
    ).toBe("top");
  });

  test("takes the side with more room when neither fits", () => {
    expect(
      tooltipPosition(
        at(400, 300),
        { width: 300, height: 600 },
        viewport,
        prefer,
      ).side,
    ).toBe("bottom");
  });

  test("centres on the trigger when there is room either side", () => {
    expect(
      tooltipPosition(at(400, 400), size, viewport, {
        side: "top",
        align: "center",
      }).align,
    ).toBe("center");
  });

  test("falls back from centre to the edge that fits", () => {
    const centre = { side: "top", align: "center" } as const;
    expect(tooltipPosition(at(20, 400), size, viewport, centre).align).toBe(
      "start",
    );
    expect(tooltipPosition(at(780, 400), size, viewport, centre).align).toBe(
      "end",
    );
  });

  test("keeps inside offset bounds", () => {
    expect(
      tooltipPosition(at(420, 400), size, { ...viewport, left: 400 }, prefer)
        .align,
    ).toBe("start");
  });

  test("mirrors the edges right to left", () => {
    expect(
      tooltipPosition(at(780, 400), size, viewport, prefer, true).align,
    ).toBe("start");
  });
});

test("Tooltip repositions as it opens", () => {
  const { container } = render(
    <Tooltip label="About limits">Hard cap</Tooltip>,
  );
  const root = container.firstElementChild as HTMLElement;
  root.getBoundingClientRect = () =>
    ({ top: 4, bottom: 28, left: 4, right: 28 }) as DOMRect;
  const content = screen.getByRole("tooltip");
  Object.defineProperty(content, "offsetWidth", { value: 300 });
  Object.defineProperty(content, "offsetHeight", { value: 80 });

  fireEvent.pointerEnter(root);

  expect(root).toHaveAttribute("data-placement", "bottom");
  expect(root).toHaveAttribute("data-align", "start");
});

test("Tooltip hides on Escape until it opens again", () => {
  render(<Tooltip label="About limits">Hard cap</Tooltip>);
  const trigger = screen.getByRole("button", { name: "About limits" });
  const content = screen.getByRole("tooltip");

  fireEvent.keyDown(trigger, { key: "Escape" });
  expect(content).toHaveStyle({ visibility: "hidden" });

  fireEvent.focus(trigger);
  expect(content).not.toHaveStyle({ visibility: "hidden" });
});

test("tooltipBounds stops at an ancestor that clips", () => {
  const { container } = render(
    <div style={{ overflow: "hidden" }}>
      <span>Trigger</span>
    </div>,
  );
  const frame = container.firstElementChild as HTMLElement;
  frame.getBoundingClientRect = () =>
    ({ top: 100, bottom: 300, left: 50, right: 450 }) as DOMRect;

  expect(tooltipBounds(frame.firstElementChild!)).toEqual({
    left: 50,
    top: 100,
    width: 400,
    height: 200,
  });
});
