import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import type { DeepPartial, SelectedPlan } from "../../types";

import {
  PricingTable,
  PricingTableContext,
  type PricingTableContextValue,
} from ".";

const mockSelectPlan = vi.fn();

const planA = {
  id: "plan-a",
  name: "Plan A",
  description: "First plan",
  current: false,
  custom: false,
  valid: true,
  entitlements: [],
  monthlyPrice: { price: 1000, currency: "usd" },
} satisfies DeepPartial<SelectedPlan> as SelectedPlan;

const planB = {
  id: "plan-b",
  name: "Plan B",
  current: false,
  custom: false,
  valid: true,
  entitlements: [],
  monthlyPrice: { price: 2000, currency: "usd" },
} satisfies DeepPartial<SelectedPlan> as SelectedPlan;

function tableContext(
  overrides: Partial<PricingTableContextValue> = {},
): PricingTableContextValue {
  return {
    plans: [planA, planB],
    addOns: [],
    periods: ["month", "year"],
    currencies: ["USD"],
    invalidFilterEntries: [],
    currentPlan: undefined,
    selectedPeriod: "month",
    setSelectedPeriod: vi.fn(),
    selectedCurrency: "USD",
    setSelectedCurrency: vi.fn(),
    isPending: false,
    hasNoUsableCurrency: false,
    showPeriodToggle: true,
    showCurrencySelector: false,
    hasCurrency: false,
    isStandalone: true,
    canCheckout: true,
    showCallToAction: true,
    callToActionUrl: undefined,
    callToActionTarget: "_blank",
    onCallToAction: undefined,
    getPlanPeriod: () => "month",
    isPlanActive: () => false,
    isAddOnActive: () => false,
    selectPlan: mockSelectPlan,
    selectAddOn: vi.fn(),
    ...overrides,
  };
}

function renderWithContext(
  ui: React.ReactNode,
  overrides?: Partial<PricingTableContextValue>,
) {
  return render(
    <PricingTableContext.Provider value={tableContext(overrides)}>
      {ui}
    </PricingTableContext.Provider>,
  );
}

beforeEach(() => {
  mockSelectPlan.mockClear();
});

describe("PricingTable primitives", () => {
  test("Plans maps over plans and Plan emits part attributes", () => {
    renderWithContext(
      <ul>
        <PricingTable.Plans>
          {(plan) => (
            <PricingTable.Plan key={plan.id} plan={plan}>
              <PricingTable.PlanName />
            </PricingTable.Plan>
          )}
        </PricingTable.Plans>
      </ul>,
    );

    expect(screen.getByText("Plan A")).toBeInTheDocument();
    expect(screen.getByText("Plan B")).toBeInTheDocument();

    const rows = document.querySelectorAll('[data-schematic-part="plan"]');
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveAttribute("data-plan-id", "plan-a");
  });

  test("PlanCta wires selectPlan on click", () => {
    renderWithContext(
      <PricingTable.Plan plan={planA}>
        <PricingTable.PlanCta>Choose</PricingTable.PlanCta>
      </PricingTable.Plan>,
    );

    fireEvent.click(screen.getByText("Choose"));
    expect(mockSelectPlan).toHaveBeenCalledWith(planA);
  });

  test("PlanCta supports asChild polymorphism", () => {
    renderWithContext(
      <PricingTable.Plan plan={planA}>
        <PricingTable.PlanCta asChild>
          <a href="/custom">Go</a>
        </PricingTable.PlanCta>
      </PricingTable.Plan>,
    );

    const link = screen.getByRole("link", { name: "Go" });
    expect(link).toHaveAttribute("href", "/custom");
    expect(link).toHaveAttribute("data-schematic-part", "plan-cta");

    fireEvent.click(link);
    expect(mockSelectPlan).toHaveBeenCalledWith(planA);
  });

  test("PlanPrice exposes computed price via render prop", () => {
    renderWithContext(
      <PricingTable.Plan plan={planA}>
        <PricingTable.PlanPrice>
          {({ price, currency, isCustom }) => (
            <span>
              {isCustom ? "custom" : `${price}-${currency}`}
            </span>
          )}
        </PricingTable.PlanPrice>
      </PricingTable.Plan>,
    );

    expect(screen.getByText("1000-usd")).toBeInTheDocument();
  });

  test("PeriodToggle exposes selection state via render prop", () => {
    const setSelectedPeriod = vi.fn();
    renderWithContext(
      <PricingTable.PeriodToggle>
        {({ periods, selectedPeriod, setSelectedPeriod, show }) => (
          <div>
            <span>show:{String(show)}</span>
            <span>selected:{selectedPeriod}</span>
            {periods.map((p) => (
              <button key={p} onClick={() => setSelectedPeriod(p)}>
                {p}
              </button>
            ))}
          </div>
        )}
      </PricingTable.PeriodToggle>,
      { setSelectedPeriod },
    );

    expect(screen.getByText("show:true")).toBeInTheDocument();
    expect(screen.getByText("selected:month")).toBeInTheDocument();

    fireEvent.click(screen.getByText("year"));
    expect(setSelectedPeriod).toHaveBeenCalledWith("year");
  });

  test("Loading and Content gate on isPending", () => {
    const { rerender } = renderWithContext(
      <>
        <PricingTable.Loading>loading…</PricingTable.Loading>
        <PricingTable.Content>ready</PricingTable.Content>
      </>,
      { isPending: true },
    );

    expect(screen.getByText("loading…")).toBeInTheDocument();
    expect(screen.queryByText("ready")).not.toBeInTheDocument();

    rerender(
      <PricingTableContext.Provider value={tableContext({ isPending: false })}>
        <PricingTable.Loading>loading…</PricingTable.Loading>
        <PricingTable.Content>ready</PricingTable.Content>
      </PricingTableContext.Provider>,
    );

    expect(screen.queryByText("loading…")).not.toBeInTheDocument();
    expect(screen.getByText("ready")).toBeInTheDocument();
  });

  test("usePricingTable throws outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => render(<PricingTable.PlanName />)).toThrow(
      /must be rendered inside/,
    );
    spy.mockRestore();
  });
});
