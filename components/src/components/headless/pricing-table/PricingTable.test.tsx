import { fireEvent, render, renderHook, screen } from "@testing-library/react";
import { act, createRef } from "react";

import { PricingTable } from "./PricingTable";
import { usePricingTable } from "./usePricingTable";

describe("usePricingTable", () => {
  test("seeds the selected period from the first available period", () => {
    const { result } = renderHook(() =>
      usePricingTable({ periods: ["month", "year"] }),
    );
    expect(result.current.selectedPeriod).toBe("month");
    expect(result.current.showPeriodToggle).toBe(true);
  });

  test("honors defaultPeriod when uncontrolled", () => {
    const { result } = renderHook(() =>
      usePricingTable({ periods: ["month", "year"], defaultPeriod: "year" }),
    );
    expect(result.current.selectedPeriod).toBe("year");
  });

  test("setSelectedPeriod updates state and calls onPeriodChange", () => {
    const onPeriodChange = vi.fn();
    const { result } = renderHook(() =>
      usePricingTable({ periods: ["month", "year"], onPeriodChange }),
    );
    act(() => result.current.setSelectedPeriod("year"));
    expect(result.current.selectedPeriod).toBe("year");
    expect(onPeriodChange).toHaveBeenCalledWith("year");
  });

  test("controlled period ignores internal updates but still notifies", () => {
    const onPeriodChange = vi.fn();
    const { result } = renderHook(() =>
      usePricingTable({
        periods: ["month", "year"],
        period: "month",
        onPeriodChange,
      }),
    );
    act(() => result.current.setSelectedPeriod("year"));
    // controlled: stays "month" until the parent updates the prop
    expect(result.current.selectedPeriod).toBe("month");
    expect(onPeriodChange).toHaveBeenCalledWith("year");
  });

  test("snaps to a valid period when the current one is no longer offered", () => {
    const { result, rerender } = renderHook(
      ({ periods }: { periods: string[] }) => usePricingTable({ periods }),
      { initialProps: { periods: ["month", "year"] } },
    );
    act(() => result.current.setSelectedPeriod("year"));
    expect(result.current.selectedPeriod).toBe("year");

    rerender({ periods: ["month"] });
    expect(result.current.selectedPeriod).toBe("month");
  });

  test("currency toggle only shows for multiple currencies", () => {
    const single = renderHook(() => usePricingTable({ currencies: ["usd"] }));
    expect(single.result.current.showCurrencyToggle).toBe(false);
    expect(single.result.current.selectedCurrency).toBe("usd");

    const many = renderHook(() =>
      usePricingTable({ currencies: ["usd", "eur"] }),
    );
    expect(many.result.current.showCurrencyToggle).toBe(true);
  });
});

describe("PricingTable compound components", () => {
  const renderTable = () =>
    render(
      <PricingTable.Root
        periods={["month", "year"]}
        currencies={["usd", "eur"]}
      >
        <PricingTable.PeriodToggle>
          <PricingTable.PeriodOption value="month">
            Monthly
          </PricingTable.PeriodOption>
          <PricingTable.PeriodOption value="year">
            Yearly
          </PricingTable.PeriodOption>
        </PricingTable.PeriodToggle>

        <PricingTable.Label>Plans</PricingTable.Label>
        <PricingTable.Section>
          <PricingTable.Card active>
            <PricingTable.Name>Pro</PricingTable.Name>
            <PricingTable.Description>For teams</PricingTable.Description>
            <PricingTable.Price>$10/mo</PricingTable.Price>
            <PricingTable.Entitlements>
              <PricingTable.Entitlement>10 seats</PricingTable.Entitlement>
            </PricingTable.Entitlements>
            <PricingTable.Footer>
              <PricingTable.CallToAction active>
                Current plan
              </PricingTable.CallToAction>
            </PricingTable.Footer>
          </PricingTable.Card>
        </PricingTable.Section>
      </PricingTable.Root>,
    );

  test("renders the root with its part attributes and class", () => {
    const { container } = renderTable();
    const root = container.querySelector('[data-part="root"]');
    expect(root).not.toBeNull();
    expect(root).toHaveClass("schematic-pricing-table");
    expect(root).toHaveAttribute("data-schematic", "pricing-table");
    expect(root).toHaveAttribute("data-period", "month");
    expect(root).toHaveAttribute("data-currency", "usd");
  });

  test("marks an active card with state attributes", () => {
    const { container } = renderTable();
    const card = container.querySelector('[data-part="card"]');
    expect(card).toHaveAttribute("data-active", "true");
    expect(card).toHaveAttribute("aria-current", "true");
    expect(card).toHaveClass("schematic-pricing-table__card");
    expect(card?.tagName).toBe("LI");
  });

  test("period options expose radio semantics and reflect selection", () => {
    renderTable();
    const monthly = screen.getByText("Monthly");
    const yearly = screen.getByText("Yearly");
    expect(monthly).toHaveAttribute("role", "radio");
    expect(monthly).toHaveAttribute("aria-checked", "true");
    expect(monthly).toHaveAttribute("data-selected", "true");
    expect(yearly).toHaveAttribute("aria-checked", "false");
  });

  test("clicking a period option updates selection and root state", () => {
    const { container } = renderTable();
    fireEvent.click(screen.getByText("Yearly"));
    expect(screen.getByText("Yearly")).toHaveAttribute("aria-checked", "true");
    expect(screen.getByText("Monthly")).toHaveAttribute(
      "aria-checked",
      "false",
    );
    expect(container.querySelector('[data-part="root"]')).toHaveAttribute(
      "data-period",
      "year",
    );
  });

  test("chains a consumer onClick with the built-in option handler", () => {
    const onClick = vi.fn();
    render(
      <PricingTable.Root periods={["month", "year"]}>
        <PricingTable.PeriodToggle>
          <PricingTable.PeriodOption value="year" onClick={onClick}>
            Yearly
          </PricingTable.PeriodOption>
        </PricingTable.PeriodToggle>
      </PricingTable.Root>,
    );
    fireEvent.click(screen.getByText("Yearly"));
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(screen.getByText("Yearly")).toHaveAttribute("aria-checked", "true");
  });

  test("CallToAction renders a button with its part attributes", () => {
    renderTable();
    const cta = screen.getByText("Current plan");
    expect(cta.tagName).toBe("BUTTON");
    expect(cta).toHaveAttribute("type", "button");
    expect(cta).toHaveAttribute("data-active", "true");
    expect(cta).toHaveClass("schematic-pricing-table__call-to-action");
  });

  test("asChild renders the consumer element and merges props/ref", () => {
    const ref = createRef<HTMLElement>();
    render(
      <PricingTable.Root asChild className="mine">
        <section ref={ref}>content</section>
      </PricingTable.Root>,
    );
    const root = document.querySelector('[data-part="root"]');
    expect(root?.tagName).toBe("SECTION");
    expect(root).toHaveClass("schematic-pricing-table");
    expect(root).toHaveClass("mine");
    expect(ref.current).toBe(root);
  });

  test("throws when a part is used outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<PricingTable.Card />)).toThrow(
      /must be used within <PricingTable.Root>/,
    );
    spy.mockRestore();
  });
});
