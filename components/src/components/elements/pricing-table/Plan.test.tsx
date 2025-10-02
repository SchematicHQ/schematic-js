import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";

import { fireEvent, render, screen } from "~/test/setup";

import { PriceInterval } from "../../../const";

import { Plan } from "./Plan";

jest.mock("../../../hooks/useEmbed", () => ({
  useEmbed: () => ({
    data: {
      showCredits: true,
      showZeroPriceAsFree: false,
      company: {
        billingSubscription: {
          status: "active",
          cancelAt: undefined,
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
    setCheckoutState: jest.fn(),
  }),
}));

jest.mock("../../../hooks/useTrialEnd", () => ({
  useTrialEnd: () => ({
    formatted: "14 days left",
  }),
}));

jest.mock("../../../hooks/useIsLightBackground", () => ({
  useIsLightBackground: () => true,
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
    price: 19.99,
    currency: "USD",
  },
  yearlyPrice: {
    price: 199.99,
    currency: "USD",
  },
  includedCreditGrants: [
    {
      name: "API Credits",
      quantity: 1000,
      period: "month",
      icon: "api",
    },
  ],
};

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
};

const mockEntitlementCounts = {
  "plan-1": {
    size: 2,
    limit: 2,
  },
};

const mockHandleToggleShowAll = jest.fn();

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

    // Check if basic plan details are rendered
    expect(screen.getByText("Basic Plan")).toBeInTheDocument();
    expect(screen.getByText("A simple plan for startups")).toBeInTheDocument();
    expect(screen.getByText("$19.99/month")).toBeInTheDocument();

    // Check features are rendered
    expect(screen.getByText("Feature 1")).toBeInTheDocument();
    expect(screen.getByText("Feature 2")).toBeInTheDocument();

    // Check credit grants are rendered
    expect(screen.getByText("1000 API Credits per month")).toBeInTheDocument();

    // Check CTA button is rendered
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
        plans={[{ ...mockPlan, current: true }]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    expect(screen.getByText("Current plan")).toBeInTheDocument();
    expect(screen.getByText("Active")).toBeInTheDocument();
    // CTA button should not be present for current plan
    expect(screen.queryByText("Choose plan")).not.toBeInTheDocument();
  });

  test("renders trial badge for trial subscription", () => {
    // Override the mock for this test
    jest.spyOn(require("../../../hooks/useEmbed"), "useEmbed").mockReturnValue({
      data: {
        showCredits: true,
        showZeroPriceAsFree: false,
        company: {
          billingSubscription: {
            status: "trialing",
            cancelAt: undefined,
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
      setCheckoutState: jest.fn(),
    });

    render(
      <Plan
        plan={{ ...mockPlan, current: true }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[{ ...mockPlan, current: true }]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    expect(screen.getByText("14 days left")).toBeInTheDocument();
  });

  test("renders disabled button for invalid plans", () => {
    render(
      <Plan
        plan={{
          ...mockPlan,
          valid: false,
          usageViolations: ["Too many users"],
        }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[{ ...mockPlan, valid: false }]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    const button = screen.getByText("Choose plan");
    expect(button).toBeDisabled();
    expect(screen.getByText("Over plan limit")).toBeInTheDocument();
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

    expect(screen.getByText("$199.99/year")).toBeInTheDocument();
  });

  test("calls handleToggleShowAll when 'See all' is clicked", () => {
    const manyEntitlementsPlan = {
      ...mockPlan,
      entitlements: Array(10)
        .fill(null)
        .map((_, i) => ({
          id: `ent-${i}`,
          feature: {
            id: `feat-${i}`,
            name: `Feature ${i}`,
          },
        })),
    };

    const manyEntitlementsCounts = {
      "plan-1": {
        size: 10,
        limit: 5,
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

    const seeAllButton = screen.getByText("See all");
    fireEvent.click(seeAllButton);

    expect(mockHandleToggleShowAll).toHaveBeenCalledWith("plan-1");
  });

  test("shows inclusion text for non-first plans", () => {
    render(
      <Plan
        plan={mockPlan}
        index={1} // Not the first plan
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

    expect(screen.getByText("Everything in Starter Plan")).toBeInTheDocument();
  });

  test("renders 'Free' text for free plans when showZeroPriceAsFree is true", () => {
    // Override the mock for this test
    jest.spyOn(require("../../../hooks/useEmbed"), "useEmbed").mockReturnValue({
      data: {
        showCredits: true,
        showZeroPriceAsFree: true,
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
      setCheckoutState: jest.fn(),
    });

    render(
      <Plan
        plan={{
          ...mockPlan,
          is_free: true,
          monthlyPrice: { price: 0, currency: "USD" },
        }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    expect(screen.getByText("Free")).toBeInTheDocument();
  });

  test("renders trial button for triable plans", () => {
    render(
      <Plan
        plan={{
          ...mockPlan,
          companyCanTrial: true,
          isTrialable: true,
          trialDays: 14,
        }}
        index={0}
        sharedProps={mockSharedProps}
        plans={[mockPlan]}
        selectedPeriod={PriceInterval.Month}
        entitlementCounts={mockEntitlementCounts}
        handleToggleShowAll={mockHandleToggleShowAll}
      />,
    );

    expect(screen.getByText("Start 14 day trial")).toBeInTheDocument();
  });

  test("handles call-to-action click", () => {
    const mockOnCallToAction = jest.fn();
    const mockSetCheckoutState = jest.fn();

    // Override the mock for this test
    jest.spyOn(require("../../../hooks/useEmbed"), "useEmbed").mockReturnValue({
      data: {
        showCredits: true,
        showZeroPriceAsFree: false,
        company: {
          billingSubscription: {
            status: "active",
          },
        },
        component: undefined, // isStandalone = true
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
    });

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
    fireEvent.click(button);

    expect(mockOnCallToAction).toHaveBeenCalledWith(mockPlan);
    // Since component is undefined (isStandalone = true), setCheckoutState should not be called
    expect(mockSetCheckoutState).not.toHaveBeenCalled();
  });
});
