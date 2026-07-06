import { render, renderHook, screen } from "@testing-library/react";
import { createRef } from "react";

import { UsageMeter } from "./UsageMeter";
import { useUsageMeter } from "./useUsageMeter";

describe("useUsageMeter", () => {
  test("computes percent for a value within range", () => {
    const { result } = renderHook(() => useUsageMeter({ value: 25, max: 100 }));
    expect(result.current.percent).toBe(25);
    expect(result.current.value).toBe(25);
  });

  test("clamps value above max to 100%", () => {
    const { result } = renderHook(() =>
      useUsageMeter({ value: 150, max: 100 }),
    );
    expect(result.current.percent).toBe(100);
    expect(result.current.value).toBe(100);
  });

  test("clamps value below min to 0%", () => {
    const { result } = renderHook(() =>
      useUsageMeter({ value: -10, max: 100, min: 0 }),
    );
    expect(result.current.percent).toBe(0);
    expect(result.current.value).toBe(0);
  });

  test("returns 0% when max is not greater than min", () => {
    const { result } = renderHook(() => useUsageMeter({ value: 5, max: 0 }));
    expect(result.current.percent).toBe(0);
  });

  test("honors a non-zero min", () => {
    const { result } = renderHook(() =>
      useUsageMeter({ value: 75, max: 100, min: 50 }),
    );
    expect(result.current.percent).toBe(50);
  });
});

describe("UsageMeter compound components", () => {
  const renderMeter = (props?: Partial<{ value: number; max: number }>) =>
    render(
      <UsageMeter.Root value={props?.value ?? 30} max={props?.max ?? 120}>
        <UsageMeter.Track>
          <UsageMeter.Fill />
        </UsageMeter.Track>
        <UsageMeter.ValueText />
      </UsageMeter.Root>,
    );

  test("renders an accessible meter with correct aria attributes", () => {
    renderMeter({ value: 30, max: 120 });
    const meter = screen.getByRole("meter");
    expect(meter).toHaveAttribute("aria-valuenow", "30");
    expect(meter).toHaveAttribute("aria-valuemin", "0");
    expect(meter).toHaveAttribute("aria-valuemax", "120");
    expect(meter).toHaveAttribute("aria-valuetext", "25%");
    expect(meter).toHaveAttribute("data-schematic", "usage-meter");
    expect(meter).toHaveClass("schematic-usage-meter");
  });

  test("Fill gets a functional width and its part attributes", () => {
    const { container } = renderMeter({ value: 30, max: 120 });
    const fill = container.querySelector('[data-part="fill"]');
    expect(fill).not.toBeNull();
    expect(fill).toHaveStyle({ width: "25%" });
    expect(fill).toHaveClass("schematic-usage-meter__fill");
  });

  test("ValueText renders the rounded percent by default", () => {
    renderMeter({ value: 30, max: 120 });
    expect(screen.getByText("25%")).toBeInTheDocument();
  });

  test("ValueText renders custom children when provided", () => {
    render(
      <UsageMeter.Root value={30} max={120}>
        <UsageMeter.ValueText>30 of 120</UsageMeter.ValueText>
      </UsageMeter.Root>,
    );
    expect(screen.getByText("30 of 120")).toBeInTheDocument();
    expect(screen.queryByText("25%")).not.toBeInTheDocument();
  });

  test("Label wires aria-labelledby on the root", () => {
    render(
      <UsageMeter.Root value={30} max={120}>
        <UsageMeter.Label>Seats</UsageMeter.Label>
      </UsageMeter.Root>,
    );
    const meter = screen.getByRole("meter");
    const label = screen.getByText("Seats");
    expect(label.id).toBeTruthy();
    expect(meter).toHaveAttribute("aria-labelledby", label.id);
  });

  test("label prop sets aria-label", () => {
    render(<UsageMeter.Root value={30} max={120} label="Seats used" />);
    expect(screen.getByRole("meter")).toHaveAttribute(
      "aria-label",
      "Seats used",
    );
  });

  test("asChild renders the consumer element and merges props/ref", () => {
    const ref = createRef<HTMLElement>();
    const onClick = vi.fn();
    render(
      <UsageMeter.Root
        asChild
        value={30}
        max={120}
        className="mine"
        onClick={onClick}
      >
        <section ref={ref}>content</section>
      </UsageMeter.Root>,
    );

    const meter = screen.getByRole("meter");
    expect(meter.tagName).toBe("SECTION");
    // base class merged with the caller's class, not clobbered
    expect(meter).toHaveClass("schematic-usage-meter");
    expect(meter).toHaveClass("mine");
    expect(ref.current).toBe(meter);

    meter.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  test("throws when a part is used outside Root", () => {
    // suppress the expected React error boundary console noise
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<UsageMeter.Fill />)).toThrow(
      /must be used within <UsageMeter.Root>/,
    );
    spy.mockRestore();
  });
});
