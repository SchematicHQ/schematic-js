import { act, fireEvent, screen } from "@testing-library/react";
import { vi } from "vitest";

import {
  BillingProductPriceInterval,
  type BillingPriceResponseData,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
} from "../../../api/checkoutexternal";
import {
  PricingTableContext,
  PricingTablePlanContext,
  type PricingTableContextValue,
  type PricingTablePlanContextValue,
} from "../../../composable/pricing-table";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { render } from "../../../test/setup";
import type { DeepPartial, SelectedPlan } from "../../../types";

import { Plan } from "./Plan";
import { type PricingTableProps } from "./PricingTable";

const { mockOnCallToAction, mockSelectPlan, trialEnd } = vi.hoisted(() => {
  const mockOnCallToAction = vi.fn();
  const mockSelectPlan = vi.fn();
  const trialEnd = new Date();
  trialEnd.setDate(trialEnd.getDate() + 15);
  return { mockOnCallToAction, mockSelectPlan, trialEnd };
});

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();
  return {
    ...actual,
    useEmbed: () => ({
      data: {
        showCredits: true,
        showPeriodToggle: true,
        showZeroPriceAsFree: true,
        trialPaymentMethodRequired: false,
        company: {
          billingSubscription: {
            status: "active",
            cancelAt: undefined,
            trialEnd: trialEnd.getTime(),
          },
        },
      },
      settings: {
        theme: {
          primary: "#000000",
          card: {
            background: "#FFFFFF",
            padding: 16,
            borderRadius: 10,
            hasShadow: true,
          },
          typography: {
            heading2: {
              fontFamily: "Arial",
              fontSize: 24,
              fontWeight: 600,
              color: "#000000",
            },
            text: {
              fontFamily: "Arial",
              fontSize: 16,
              fontWeight: 400,
              color: "#000000",
            },
          },
        },
      },
    }),
    useIsLightBackground: () => true,
    useTrialEnd: () => trialEnd,
  };
});

const mockPlan = {
  id: "plan-1",
  name: "Basic Plan",
  description: "A simple plan for startups",
  current: false,
  custom: false,
  valid: true,
  companyCanTrial: false,
  isTrialable: false,
  trialDays: null,
  entitlements: [
    {
      id: "ent-1",
      feature: {
        id: "feat-1",
        name: "Feature 1",
        icon: "check",
        description: "A cool feature",
      },
    },
    {
      id: "ent-2",
      feature: {
        id: "feat-2",
        name: "Feature 2",
        icon: "alert",
      },
    },
  ],
  monthlyPrice: {
    price: 1999,
    priceDecimal: "1999",
    currency: "usd",
  },
  yearlyPrice: {
    price: 19999,
    priceDecimal: "19999",
    currency: "usd",
  },
  includedCreditGrants: [
    {
      creditName: "API Credits",
      creditAmount: 1000,
      creditIcon: "api",
      resetCadence: "monthly",
    },
  ],
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
    selectPlan: mockSelectPlan,
    selectAddOn: vi.fn(),
    ...overrides,
  };
}

function planContext(
  plan: SelectedPlan,
  overrides: Partial<PricingTablePlanContextValue> = {},
): PricingTablePlanContextValue {
  return {
    plan,
    index: 0,
    plans: [plan],
    period: BillingProductPriceInterval.Month,
    currency: undefined,
    isActive: false,
    kind: "plan",
    ...overrides,
  };
}

function renderPlan(
  plan: SelectedPlan,
  {
    plan: planOverrides,
    table,
  }: {
    plan?: Partial<PricingTablePlanContextValue>;
    table?: Partial<PricingTableContextValue>;
  } = {},
) {
  return render(
    <PricingTableContext.Provider value={tableContext(table)}>
      <PricingTablePlanContext.Provider value={planContext(plan, planOverrides)}>
        <Plan layout={mockLayout} />
      </PricingTablePlanContext.Provider>
    </PricingTableContext.Provider>,
  );
}

describe("`Plan` component", () => {
  test("renders plan correctly", () => {
    renderPlan(mockPlan);

    expect(screen.getByText("Basic Plan")).toBeInTheDocument();
    expect(screen.getByText("A simple plan for startups")).toBeInTheDocument();
    expect(screen.getByText("$19.99")).toBeInTheDocument();
    expect(screen.getByText("/month")).toBeInTheDocument();

    expect(screen.getByText("Feature 1")).toBeInTheDocument();
    expect(screen.getByText("Feature 2")).toBeInTheDocument();

    expect(screen.getByText("1000 API Credits per month")).toBeInTheDocument();

    const ctaButton = screen.getByText("Choose plan");
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute("href", "/checkout");
  });

  test("renders 'Current plan' when plan is active", () => {
    renderPlan(
      { ...mockPlan, current: true },
      { plan: { isActive: true } },
    );

    expect(screen.getByText("Current plan")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Choose plan")).not.toBeInTheDocument();
  });

  // `trialEnd` is not available in standalone mode
  // TODO: figure out how to render a subcomponent with company context (ie. not standalone)
  // NOTE: Cannot use vi.mock() inside test cases - mocks are hoisted and would override the main mock
  test.skip("renders trial badge for trial subscription", async () => {
    renderPlan(
      {
        ...mockPlan,
        current: true,
        isTrialable: true,
        companyCanTrial: true,
        trialDays: 30,
      },
      { plan: { isActive: true } },
    );

    expect(await screen.findByText("14 days left")).toBeInTheDocument();
  });

  test("renders disabled button for invalid plans", () => {
    renderPlan({
      ...mockPlan,
      valid: false,
      usageViolations: [{ allocation: 5, usage: 8 } as FeatureUsageResponseData],
    });

    const button = screen.getByTestId("sch-plan-cta-button");
    expect(button).toHaveTextContent("Over plan limit");
  });

  test("renders custom plans correctly", () => {
    renderPlan({
      ...mockPlan,
      custom: true,
      customPlanConfig: {
        ctaText: "Contact sales",
        priceText: "Custom pricing",
        ctaWebSite: "https://example.com/contact",
      },
    });

    expect(screen.getByText("Custom pricing")).toBeInTheDocument();

    const button = screen.getByText("Contact sales");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "https://example.com/contact");
  });

  test("renders yearly pricing when selected", () => {
    renderPlan(mockPlan, {
      plan: { period: BillingProductPriceInterval.Year },
    });

    const planPrice = screen.getByTestId("sch-plan-price");
    expect(planPrice).toHaveTextContent("$199.99/year");
  });

  test("expands and collapses entitlements when 'See all' / 'Hide all' is clicked", () => {
    const totalEntitlements = 10;
    const manyEntitlementsPlan = {
      ...mockPlan,
      entitlements: Array(totalEntitlements)
        .fill(null)
        .map(
          (_, i) =>
            ({
              id: `ent-${i}`,
              feature: {
                id: `feat-${i}`,
                name: `Feature ${i}`,
              },
            }) as PlanEntitlementResponseData,
        ),
    };

    renderPlan(manyEntitlementsPlan, {
      plan: { plans: [manyEntitlementsPlan] },
    });

    // Collapsed: only the first VISIBLE_ENTITLEMENT_COUNT features are rendered.
    for (let i = 0; i < VISIBLE_ENTITLEMENT_COUNT; i++) {
      expect(screen.getByText(`Feature ${i}`)).toBeInTheDocument();
    }
    expect(
      screen.queryByText(`Feature ${VISIBLE_ENTITLEMENT_COUNT}`),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(`Feature ${totalEntitlements - 1}`),
    ).not.toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByText("See all"));
    });

    // Expanded: all features are rendered, and the toggle flips to "Hide all".
    for (let i = 0; i < totalEntitlements; i++) {
      expect(screen.getByText(`Feature ${i}`)).toBeInTheDocument();
    }
    expect(screen.getByText("Hide all")).toBeInTheDocument();

    act(() => {
      fireEvent.click(screen.getByText("Hide all"));
    });

    // Collapsed again.
    expect(
      screen.queryByText(`Feature ${totalEntitlements - 1}`),
    ).not.toBeInTheDocument();
    expect(screen.getByText("See all")).toBeInTheDocument();
  });

  test("shows inclusion text for non-first plans", () => {
    renderPlan(mockPlan, {
      plan: {
        index: 1,
        plans: [
          { ...mockPlan, id: "previous-plan", name: "Starter Plan" },
          mockPlan,
        ],
      },
    });

    expect(screen.getByText(/Everything in Starter Plan/)).toBeInTheDocument();
  });

  // `showZeroPriceAsFree` value defaults to "false"
  // TODO: figure out how to mock the value
  // NOTE: Cannot use vi.mock() inside test cases - mocks are hoisted and would override the main mock
  test.skip("renders 'Free' text for free plans when `showZeroPriceAsFree` is true", async () => {
    renderPlan({
      ...mockPlan,
      isFree: true,
      monthlyPrice: {
        price: 0,
        priceDecimal: "0",
        currency: "usd",
      } as BillingPriceResponseData,
      yearlyPrice: {
        price: 0,
        priceDecimal: "0",
        currency: "usd",
      } as BillingPriceResponseData,
    });

    const button = await screen.findByTestId("sch-plan-cta-button");
    expect(button).toHaveTextContent("Free");
  });

  test("handles call-to-action click", () => {
    renderPlan(mockPlan, {
      table: {
        callToActionUrl: undefined,
        onCallToAction: mockOnCallToAction,
      },
    });

    const button = screen.getByText("Choose plan");
    act(() => {
      fireEvent.click(button);
    });

    // The CTA delegates to the controller's `selectPlan` action.
    expect(mockSelectPlan).toHaveBeenCalledWith(mockPlan);
  });
});
