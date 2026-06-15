import { act, fireEvent, screen } from "@testing-library/react";
import cloneDeep from "lodash/cloneDeep";
import { vi } from "vitest";

import {
  BillingProductPriceInterval,
  EntitlementValueType,
  EntityType,
  FeatureType,
  MetricPeriod,
  PlanEntitlementResponseData,
  TraitType,
} from "../../../api/checkoutexternal";
import {
  PricingTableContext,
  PricingTablePlanContext,
  type PricingTableContextValue,
  type PricingTablePlanContextValue,
} from "../../../composable/pricing-table";
import { render } from "../../../test/setup";
import type { DeepPartial, SelectedPlan } from "../../../types";

import { AddOn } from "./AddOn";
import { type PricingTableProps } from "./PricingTable";

const { mockOnCallToAction, mockSelectAddOn } = vi.hoisted(() => ({
  mockOnCallToAction: vi.fn(),
  mockSelectAddOn: vi.fn(),
}));

vi.mock("../../../hooks", () => ({
  useEmbed: () => ({
    data: {
      company: {
        addOns: [],
      },
      capabilities: {
        checkout: true,
      },
    },
    settings: {
      theme: {
        primary: "#194BFB",
        card: {
          background: "#FFFFFF",
          padding: 16,
          borderRadius: 10,
          hasShadow: true,
        },
        typography: {
          text: {
            fontSize: 16,
            color: "#000000",
          },
        },
      },
    },
  }),
  useIsLightBackground: () => true,
}));

const mockAddOn = {
  id: "addon-1",
  name: "API Boost",
  description: "Increase your API call limits",
  current: false,
  valid: true,
  custom: false,
  entitlements: [
    {
      id: "ent-1",
      feature: {
        id: "feat-1",
        name: "Extra API Calls",
        icon: "api",
        description: "Additional API calls per month",
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 10000,
    },
    {
      id: "ent-2",
      feature: {
        id: "feat-2",
        name: "Priority Support",
        singularName: "Priority Support",
        pluralName: "Priority Support",
        icon: "headset",
      },
      valueType: EntitlementValueType.Trait,
      valueTrait: {
        id: "trait-1",
        displayName: "Number of Locations",
        entityType: EntityType.Company,
        traitType: TraitType.Number,
      },
    },
  ],
  monthlyPrice: {
    price: 999,
    currency: "USD",
  },
  yearlyPrice: {
    price: 9999,
    currency: "USD",
  },
} satisfies DeepPartial<SelectedPlan> as SelectedPlan;

const mockLayout = {
  showPeriodToggle: true,
  showCurrencySelector: true,
  showDiscount: true,
  header: {
    isVisible: true,
    fontStyle: "heading3",
  },
  plans: {
    isVisible: true,
    name: {
      fontStyle: "heading2",
    },
    description: {
      isVisible: true,
      fontStyle: "text",
    },
    showInclusionText: true,
    showFeatureIcons: true,
    showFeatureDescriptions: false,
    showEntitlements: true,
  },
  addOns: {
    isVisible: true,
    showDescription: true,
    showFeatureIcons: true,
    showFeatureDescriptions: false,
    showEntitlements: true,
  },
  upgrade: {
    isVisible: true,
    buttonSize: "md",
    buttonStyle: "primary",
  },
  downgrade: {
    isVisible: true,
    buttonSize: "md",
    buttonStyle: "primary",
  },
} satisfies DeepPartial<PricingTableProps> as PricingTableProps;

function tableContext(
  overrides: Partial<PricingTableContextValue> = {},
): PricingTableContextValue {
  return {
    plans: [],
    addOns: [],
    periods: [],
    currencies: [],
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
    callToActionUrl: "/checkout",
    callToActionTarget: "_self",
    onCallToAction: undefined,
    getPlanPeriod: () => "month",
    isPlanActive: () => false,
    isAddOnActive: () => false,
    selectPlan: vi.fn(),
    selectAddOn: mockSelectAddOn,
    ...overrides,
  };
}

function planContext(
  addOn: SelectedPlan,
  overrides: Partial<PricingTablePlanContextValue> = {},
): PricingTablePlanContextValue {
  return {
    plan: addOn,
    index: 0,
    plans: [addOn],
    period: BillingProductPriceInterval.Month,
    currency: undefined,
    isActive: false,
    kind: "addOn",
    ...overrides,
  };
}

function renderAddOn(
  addOn: SelectedPlan,
  {
    layout = mockLayout,
    plan: planOverrides,
    table,
  }: {
    layout?: PricingTableProps;
    plan?: Partial<PricingTablePlanContextValue>;
    table?: Partial<PricingTableContextValue>;
  } = {},
) {
  return render(
    <PricingTableContext.Provider value={tableContext(table)}>
      <PricingTablePlanContext.Provider value={planContext(addOn, planOverrides)}>
        <AddOn layout={layout} />
      </PricingTablePlanContext.Provider>
    </PricingTableContext.Provider>,
  );
}

describe("`AddOn` component", () => {
  test("renders add-on correctly", () => {
    renderAddOn(mockAddOn);

    expect(screen.getByText("API Boost")).toBeInTheDocument();
    expect(
      screen.getByText("Increase your API call limits"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sch-addon-price")).toHaveTextContent(
      "$9.99/month",
    );

    const ctaButton = screen.getByText("Choose add-on");
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute("href", "/checkout");
  });

  test("renders active add-on correctly", () => {
    renderAddOn(
      { ...mockAddOn, current: true },
      { plan: { isActive: true }, table: { callToActionUrl: undefined } },
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Remove add-on")).toBeInTheDocument();
  });

  test("renders yearly pricing when selected", () => {
    renderAddOn(mockAddOn, {
      plan: { period: BillingProductPriceInterval.Year },
    });

    expect(screen.getByTestId("sch-addon-price")).toHaveTextContent(
      "$99.99/year",
    );
  });

  test("renders 'Change add-on' for current add-on with different period", () => {
    renderAddOn(
      { ...mockAddOn, current: true },
      { plan: { period: BillingProductPriceInterval.Year, isActive: false } },
    );

    expect(screen.getByText("Change add-on")).toBeInTheDocument();
  });

  test("hides features when `showEntitlements` is 'false'", () => {
    const layout = cloneDeep(mockLayout);
    layout.addOns.showEntitlements = false;

    renderAddOn(mockAddOn, { layout });

    expect(screen.queryByText("Extra API Calls")).not.toBeInTheDocument();
    expect(screen.queryByText("Priority Support")).not.toBeInTheDocument();
  });

  test("hides description when `showDescription` is 'false'", () => {
    const layout = cloneDeep(mockLayout);
    layout.addOns.showDescription = false;

    renderAddOn(mockAddOn, { layout });

    expect(
      screen.queryByText("Increase your API call limits"),
    ).not.toBeInTheDocument();
  });

  test("hides feature icons when `showFeatureIcons` is 'false'", () => {
    const layout = cloneDeep(mockLayout);
    layout.addOns.showFeatureIcons = false;

    renderAddOn(mockAddOn, { layout });

    expect(screen.queryByTestId("sch-feature-icon")).not.toBeInTheDocument();
  });

  test("delegates to `selectAddOn` when clicking active add-on button", () => {
    renderAddOn(
      { ...mockAddOn, current: true },
      {
        plan: { isActive: true },
        table: {
          callToActionUrl: undefined,
          onCallToAction: mockOnCallToAction,
        },
      },
    );

    const button = screen.getByTestId("sch-addon-cta-button");
    act(() => {
      fireEvent.click(button);
    });

    expect(mockSelectAddOn).toHaveBeenCalledWith({
      ...mockAddOn,
      current: true,
    });
  });

  test("delegates to `selectAddOn` when clicking non-active add-on button", () => {
    renderAddOn(mockAddOn, {
      table: {
        callToActionUrl: undefined,
        onCallToAction: mockOnCallToAction,
      },
    });

    const button = screen.getByTestId("sch-addon-cta-button");
    act(() => {
      fireEvent.click(button);
    });

    expect(mockSelectAddOn).toHaveBeenCalledWith(mockAddOn);
  });

  test("does not render limited entitlements without a price behavior", () => {
    renderAddOn({
      ...mockAddOn,
      entitlements: [
        {
          id: "ent-1",
          feature: {
            id: "feat-1",
            name: "API Calls",
            icon: "api",
            featureType: FeatureType.Event,
          },
          valueType: "numeric",
          valueNumeric: 10000,
          metricPeriod: MetricPeriod.CurrentMonth,
        } as PlanEntitlementResponseData,
      ],
    });

    expect(
      screen.queryByText("10,000 API Calls per month"),
    ).not.toBeInTheDocument();
  });

  test("renders unlimited entitlements correctly", () => {
    renderAddOn({
      ...mockAddOn,
      entitlements: [
        {
          id: "ent-1",
          feature: {
            id: "feat-1",
            name: "API Calls",
            icon: "api",
          },
          valueType: EntitlementValueType.Unlimited,
        } as PlanEntitlementResponseData,
      ],
    });

    expect(screen.getByText("API Calls")).toBeInTheDocument();
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
  });
});
