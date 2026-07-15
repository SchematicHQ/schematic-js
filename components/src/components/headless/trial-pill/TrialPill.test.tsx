import { render, renderHook, screen } from "@testing-library/react";
import { createRef } from "react";

import { toPrettyDate } from "../../../utils";

import { TrialPill } from "./TrialPill";
import { useTrialPill } from "./useTrialPill";

const NOW = new Date("2026-07-02T00:00:00.000Z");
const IN_FIVE_DAYS = new Date("2026-07-07T00:00:00.000Z");
const FIVE_DAYS_AGO = new Date("2026-06-27T00:00:00.000Z");

describe("useTrialPill", () => {
  test("computes time remaining for an active trial", () => {
    const { result } = renderHook(() =>
      useTrialPill({
        trialEndDate: IN_FIVE_DAYS,
        trialStatus: "active",
        now: NOW,
      }),
    );
    expect(result.current.hasTrial).toBe(true);
    expect(result.current.isActive).toBe(true);
    expect(result.current.isExpired).toBe(false);
    expect(result.current.amount).toBe(5);
    expect(result.current.units).toBe("days");
    expect(result.current.endDateLabel).toBe(toPrettyDate(IN_FIVE_DAYS));
  });

  test("marks a past end date as expired with a positive magnitude", () => {
    const { result } = renderHook(() =>
      useTrialPill({ trialEndDate: FIVE_DAYS_AGO, now: NOW }),
    );
    expect(result.current.isExpired).toBe(true);
    expect(result.current.isActive).toBe(false);
    expect(result.current.amount).toBe(5);
    expect(result.current.units).toBe("days");
  });

  test("expired status without a date still has a trial", () => {
    const { result } = renderHook(() =>
      useTrialPill({ trialStatus: "expired", now: NOW }),
    );
    expect(result.current.hasTrial).toBe(true);
    expect(result.current.isExpired).toBe(true);
    expect(result.current.amount).toBeUndefined();
  });

  test("converted plans have no trial to show", () => {
    const { result } = renderHook(() =>
      useTrialPill({
        trialEndDate: IN_FIVE_DAYS,
        trialStatus: "converted",
        now: NOW,
      }),
    );
    expect(result.current.hasTrial).toBe(false);
  });

  test("no data yields no trial", () => {
    const { result } = renderHook(() => useTrialPill({ now: NOW }));
    expect(result.current.hasTrial).toBe(false);
  });

  test("uses singular units for a single remaining day", () => {
    const oneDay = new Date("2026-07-03T00:00:00.000Z");
    const { result } = renderHook(() =>
      useTrialPill({ trialEndDate: oneDay, now: NOW }),
    );
    expect(result.current.amount).toBe(1);
    expect(result.current.units).toBe("day");
  });
});

describe("TrialPill compound components", () => {
  const renderPill = (
    props?: Partial<{
      trialEndDate: Date;
      trialStatus: "active" | "converted" | "expired";
    }>,
  ) =>
    render(
      <TrialPill.Root
        trialEndDate={props?.trialEndDate ?? IN_FIVE_DAYS}
        trialStatus={props?.trialStatus ?? "active"}
        now={NOW}
      >
        <TrialPill.Label>Trial</TrialPill.Label>
        <TrialPill.TimeRemaining />
        <TrialPill.EndDate />
      </TrialPill.Root>,
    );

  test("renders the pill with status/state data attributes", () => {
    const { container } = renderPill();
    const root = container.querySelector('[data-schematic="trial-pill"]');
    expect(root).not.toBeNull();
    expect(root).toHaveClass("schematic-trial-pill");
    expect(root).toHaveAttribute("data-trial-status", "active");
    expect(root).not.toHaveAttribute("data-expired");
  });

  test("renders nothing when the plan has converted", () => {
    const { container } = renderPill({ trialStatus: "converted" });
    expect(container).toBeEmptyDOMElement();
  });

  test("TimeRemaining renders the amount and units by default", () => {
    renderPill();
    expect(screen.getByText("5 days")).toBeInTheDocument();
  });

  test("EndDate renders a <time> with a machine-readable datetime", () => {
    const { container } = renderPill();
    const time = container.querySelector('[data-part="end-date"]');
    expect(time?.tagName).toBe("TIME");
    expect(time).toHaveAttribute("datetime", IN_FIVE_DAYS.toISOString());
    expect(time).toHaveTextContent(toPrettyDate(IN_FIVE_DAYS));
  });

  test("marks an expired trial with data-expired", () => {
    const { container } = render(
      <TrialPill.Root trialEndDate={FIVE_DAYS_AGO} now={NOW}>
        <TrialPill.TimeRemaining />
      </TrialPill.Root>,
    );
    const root = container.querySelector('[data-schematic="trial-pill"]');
    expect(root).toHaveAttribute("data-expired", "true");
  });

  test("parts accept custom children that override the defaults", () => {
    render(
      <TrialPill.Root trialEndDate={IN_FIVE_DAYS} now={NOW}>
        <TrialPill.TimeRemaining>5 days left in trial</TrialPill.TimeRemaining>
      </TrialPill.Root>,
    );
    expect(screen.getByText("5 days left in trial")).toBeInTheDocument();
    expect(screen.queryByText("5 days")).not.toBeInTheDocument();
  });

  test("asChild renders the consumer element and merges props/ref", () => {
    const ref = createRef<HTMLDivElement>();
    render(
      <TrialPill.Root
        asChild
        trialEndDate={IN_FIVE_DAYS}
        trialStatus="active"
        now={NOW}
        className="mine"
      >
        <div ref={ref}>content</div>
      </TrialPill.Root>,
    );
    const root = screen.getByText("content");
    expect(root.tagName).toBe("DIV");
    expect(root).toHaveClass("schematic-trial-pill");
    expect(root).toHaveClass("mine");
    expect(root).toHaveAttribute("data-trial-status", "active");
    expect(ref.current).toBe(root);
  });

  test("throws when a part is used outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<TrialPill.TimeRemaining />)).toThrow(
      /must be used within <TrialPill.Root>/,
    );
    spy.mockRestore();
  });
});
