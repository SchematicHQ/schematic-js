import { vi } from "vitest";

import {
  type BillingPriceResponseData,
  type FeatureUsageResponseData,
  type PlanEntitlementResponseData,
} from "../../../api/checkoutexternal";
import { PriceInterval, VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { type EmbedContextProps } from "../../../context";
import { act, fireEvent, render, screen } from "../../../test/setup";
import type { DeepPartial, SelectedPlan } from "../../../types";

import { Plan, type PlanProps } from "./Plan";

const mockOnCallToAction = vi.fn();
const mockSetCheckoutState = vi.fn();

const trialEnd = new Date();
trialEnd.setDate(trialEnd.getDate() + 15);

vi.mock("../../../hooks", () => ({
  useEmbed: () =>
    ({
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
      setCheckoutState: mockSetCheckoutState,
    }) satisfies DeepPartial<EmbedContextProps>,
  useIsLightBackground: () => true,
  useTrialEnd: () => trialEnd,
}));

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

const mockSharedProps = {
  layout: {
    showPeriodToggle: true,
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
  },
  showCallToAction: true,
  callToActionUrl: "/checkout",
  callToActionTarget: "_self",
} satisfies DeepPartial<PlanProps["sharedProps"]> as PlanProps["sharedProps"];

const mockEntitlementCounts = {
  "plan-1": {
    size: 2,
    limit: 2,
  },
};

const mockHandleToggleShowAll = vi.fn();

describe("`Plan` component", () => {
  test("renders plan correctly", () => {
    render(
      <Plan
        plan={mockPlan}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

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
    render(
      <Plan
        plan={{ ...mockPlan, current: true }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    expect(screen.getByText("Current plan")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.queryByText("Choose plan")).not.toBeInTheDocument();
  });

  // `trialEnd` is not available in standalone mode
  // TODO: figure out how to render a subcomponent with company context (ie. not standalone)
  test.skip("renders trial badge for trial subscription", async () => {
    vi.mock("../../../hooks", () => {
      const trialEnd = new Date();
      trialEnd.setDate(trialEnd.getDate() + 15);

      return {
        useEmbed: () =>
          ({
            data: {
              showCredits: true,
              showPeriodToggle: true,
              showZeroPriceAsFree: true,
              trialPaymentMethodRequired: false,
              company: {
                billingSubscription: {
                  status: "trialing",
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
          }) as EmbedContextProps,
      };
    });

    render(
      <Plan
        plan={{
          ...mockPlan,
          current: true,
          isTrialable: true,
          companyCanTrial: true,
          trialDays: 30,
        }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    expect(await screen.findByText("14 days left")).toBeInTheDocument();
  });

  test("renders disabled button for invalid plans", () => {
    render(
      <Plan
        plan={{
          ...mockPlan,
          valid: false,
          usageViolations: [
            { allocation: 5, usage: 8 } as FeatureUsageResponseData,
          ],
        }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    const button = screen.getByTestId("sch-plan-cta-button");
    expect(button).toHaveTextContent("Over plan limit");
  });

  test("renders custom plans correctly", () => {
    render(
      <Plan
        plan={{
          ...mockPlan,
          custom: true,
          customPlanConfig: {
            ctaText: "Contact sales",
            priceText: "Custom pricing",
            ctaWebSite: "https://example.com/contact",
          },
        }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    expect(screen.getByText("Custom pricing")).toBeInTheDocument();

    const button = screen.getByText("Contact sales");
    expect(button).toBeInTheDocument();
    expect(button).toHaveAttribute("href", "https://example.com/contact");
  });

  test("renders yearly pricing when selected", () => {
    render(
      <Plan
        plan={mockPlan}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Year}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    const planPrice = screen.getByTestId("sch-plan-price");
    expect(planPrice).toHaveTextContent("$199.99/year");
  });

  test("calls handleToggleShowAll when 'See all' is clicked", () => {
    const manyEntitlementsPlan = {
      ...mockPlan,
      entitlements: Array(10)
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

    const manyEntitlementsCounts = {
      "plan-1": {
        size: 10,
        limit: VISIBLE_ENTITLEMENT_COUNT,
      },
    };

    render(
      <Plan
        plan={manyEntitlementsPlan}
        index={0}
        sharedProps={mockSharedProps}
        plans={[manyEntitlementsPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={manyEntitlementsCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    act(() => {
      const seeAllButton = screen.getByText("See all");
      fireEvent.click(seeAllButton);
    });

    expect(mockHandleToggleShowAll).toHaveBeenCalledWith("plan-1");
  });

  test("shows inclusion text for non-first plans", () => {
    render(
      <Plan
        plan={mockPlan}
        index={1}
        sharedProps={mockSharedProps}
        plans={[
          { ...mockPlan, id: "previous-plan", name: "Starter Plan" },
          mockPlan,
        ]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    expect(screen.getByText(/Everything in Starter Plan/)).toBeInTheDocument();
  });

  // `showZeroPriceAsFree` value defaults to "false"
  // TODO: figure out how to mock the value
  test.skip("renders 'Free' text for free plans when `showZeroPriceAsFree` is true", async () => {
    vi.mock("../../../hooks", () => {
      return {
        useEmbed: () => ({
          data: {
            showCredits: true,
            showPeriodToggle: true,
            showZeroPriceAsFree: true,
            trialPaymentMethodRequired: false,
            company: {
              billingSubscription: {
                status: "active",
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
      };
    });

    render(
      <Plan
        plan={{
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
        }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    const button = await screen.findByTestId("sch-plan-cta-button");
    expect(button).toHaveTextContent("Free");
  });

  test("handles call-to-action click", () => {
    render(
      <Plan
        plan={mockPlan}
        index={0}
        sharedProps={{
          ...mockSharedProps,
          callToActionUrl: undefined,
          onCallToAction: mockOnCallToAction,
        }}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    const button = screen.getByText("Choose plan");
    act(() => {
      fireEvent.click(button);
    });

    expect(mockOnCallToAction).toHaveBeenCalledWith(mockPlan);
    expect(mockSetCheckoutState).not.toHaveBeenCalled();
  });
});
