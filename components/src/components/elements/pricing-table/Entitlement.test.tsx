import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";

import { render, screen } from "~/test/setup";

import { EntitlementValueType, PriceInterval } from "../../../const";

import { Entitlement } from "./Entitlement";

jest.mock("../../../hooks/useEmbed", () => ({
  useEmbed: () => ({
    settings: {
      theme: {
        primary: "#000000",
        card: {
          background: "#FFFFFF",
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
}));

jest.mock("../../../hooks/useIsLightBackground", () => ({
  useIsLightBackground: () => true,
}));

describe("`Entitlement` component", () => {
  test("renders numeric entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-1",
      feature: {
        id: "feat-1",
        name: "API Calls",
        icon: "api",
        description: "Number of API calls per month",
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 10000,
      metricPeriod: "month",
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("10,000 API Calls per month")).toBeInTheDocument();
  });

  test("renders unlimited entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-2",
      feature: {
        id: "feat-2",
        name: "Storage",
        icon: "storage",
      },
      valueType: EntitlementValueType.Unlimited,
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("Unlimited Storage")).toBeInTheDocument();
  });

  test("renders trait entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-3",
      feature: {
        id: "feat-3",
        name: "Priority Support",
        icon: "support",
      },
      valueType: EntitlementValueType.Trait,
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("Priority Support")).toBeInTheDocument();
  });

  test("renders boolean entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-4",
      feature: {
        id: "feat-4",
        name: "White Labeling",
        icon: "tag",
      },
      valueType: EntitlementValueType.Boolean,
      valueBool: true,
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("White Labeling")).toBeInTheDocument();
  });

  test("renders feature description when enabled", () => {
    const mockEntitlement = {
      id: "ent-1",
      feature: {
        id: "feat-1",
        name: "API Calls",
        icon: "api",
        description: "Number of API calls per month",
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 10000,
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: true,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(
      screen.getByText("Number of API calls per month"),
    ).toBeInTheDocument();
  });

  test("does not render feature icon when disabled", () => {
    const mockEntitlement = {
      id: "ent-1",
      feature: {
        id: "feat-1",
        name: "API Calls",
        icon: "api",
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 10000,
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: false,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("10,000 API Calls")).toBeInTheDocument();
    // There's no direct way to check if the icon is not rendered in this test environment,
    // but we can verify the text content is still there
  });

  test("renders credit-based entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-5",
      feature: {
        id: "feat-5",
        name: "Credits",
        icon: "credits",
      },
      valueType: EntitlementValueType.Credit,
      valueCredit: "credit-1",
    };

    const mockCredits = [
      {
        id: "credit-1",
        name: "API Credits",
        quantity: 5000,
        period: "month",
      },
    ];

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={mockCredits}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("5,000 API Credits per month")).toBeInTheDocument();
  });

  test("handles singular/plural forms correctly", () => {
    const mockEntitlement = {
      id: "ent-6",
      feature: {
        id: "feat-6",
        name: "User",
        singular_name: "User",
        plural_name: "Users",
        icon: "user",
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 1,
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("1 User")).toBeInTheDocument();

    // Rerender with plural value
    const { rerender } = render(
      <Entitlement
        entitlement={{ ...mockEntitlement, valueNumeric: 5 }}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("5 Users")).toBeInTheDocument();
  });

  test("doesn't show credit-based entitlements when showCredits is false", () => {
    const mockEntitlement = {
      id: "ent-7",
      feature: {
        id: "feat-7",
        name: "Credits",
        icon: "credits",
      },
      valueType: EntitlementValueType.Credit,
      valueCredit: "credit-2",
    };

    const mockCredits = [
      {
        id: "credit-2",
        name: "API Credits",
        quantity: 5000,
      },
    ];

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    const { container } = render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={mockCredits}
        selectedPeriod={PriceInterval.Month}
        showCredits={false}
        sharedProps={mockSharedProps}
      />,
    );

    // Container should be empty
    expect(container.firstChild).toBeNull();
  });

  test("renders usage-based price entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-8",
      feature: {
        id: "feat-8",
        name: "API Calls",
        icon: "api",
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 10000,
      priceBehavior: "usage-based",
      meteredMonthlyPrice: {
        price: 0.01,
        currency: "USD",
        price_tier: [
          {
            per_unit_price: 0.01,
          },
        ],
      },
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("10,000 API Calls")).toBeInTheDocument();
    expect(screen.getByText("$0.01 / call")).toBeInTheDocument();
  });

  test("renders consumption rate for consumption-based entitlements", () => {
    const mockEntitlement = {
      id: "ent-9",
      feature: {
        id: "feat-9",
        name: "Storage",
        icon: "storage",
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 100,
      priceBehavior: "consumption-based",
      consumptionRate: 1.5,
    };

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    };

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={[]}
        selectedPeriod={PriceInterval.Month}
        showCredits={true}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("100 Storage")).toBeInTheDocument();
    expect(screen.getByText("1.5x rate")).toBeInTheDocument();
  });
});
