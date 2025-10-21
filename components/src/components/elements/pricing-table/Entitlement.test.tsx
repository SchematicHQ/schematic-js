import "@testing-library/dom";
import "@testing-library/jest-dom";

import { type PlanEntitlementResponseData } from "../../../api/componentspublic";
import {
  EntitlementValueType,
  FeatureType,
  PriceBehavior,
} from "../../../const";
import { render, screen } from "../../../test/setup";
import type { Credit, DeepPartial } from "../../../types";

import { Entitlement, type EntitlementProps } from "./Entitlement";

type SharedProps = EntitlementProps["sharedProps"];

describe("`Entitlement` component", () => {
  test("renders numeric entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-1",
      feature: {
        id: "feat-1",
        name: "API Calls",
        icon: "api",
        description: "Number of API calls per month",
        featureType: FeatureType.Event,
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 10000,
      metricPeriod: "current_month",
    } as PlanEntitlementResponseData;

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
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
        name: "API Calls",
        icon: "api",
      },
      valueType: EntitlementValueType.Unlimited,
    } as PlanEntitlementResponseData;

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("Unlimited API Calls")).toBeInTheDocument();
  });

  // TODO: verify value type for trait-based entitlement
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip("renders trait entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-3",
      feature: {
        id: "feat-3",
        name: "Priority Support",
        icon: "support",
      },
      valueType: EntitlementValueType.Trait,
      valueTrait: {},
    } as PlanEntitlementResponseData;

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText(/Priority Support/)).toBeInTheDocument();
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
    } as PlanEntitlementResponseData;

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
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
    } as PlanEntitlementResponseData;

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: true,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
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
    } as PlanEntitlementResponseData;

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: false,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("10,000 API Calls")).toBeInTheDocument();
    expect(screen.queryByTestId("sch-feature-icon")).not.toBeInTheDocument();
  });

  test("renders credit-based entitlement correctly", () => {
    const mockEntitlement = {
      id: "ent-5",
      feature: {
        id: "feat-5",
        name: "API Call",
        icon: "api",
      },
      priceBehavior: PriceBehavior.Credit,
      valueType: EntitlementValueType.Credit,
      valueCredit: {
        id: "credit-1",
        name: "API Credits",
        icon: "credit",
      },
      consumptionRate: 1,
    } as PlanEntitlementResponseData;

    const mockCredits = [
      {
        id: "credit-1",
        name: "API Credits",
        icon: "credit",
        quantity: 5000,
        period: "month",
      } satisfies DeepPartial<Credit> as Credit,
    ];

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={mockCredits}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("1 API Credit per API Call")).toBeInTheDocument();
  });

  test("handles singular/plural forms correctly", () => {
    const mockEntitlement = {
      id: "ent-6",
      feature: {
        id: "feat-6",
        name: "User",
        singularName: "User",
        pluralName: "Users",
        icon: "user",
      },
      valueType: EntitlementValueType.Numeric,
      valueNumeric: 1,
    } as PlanEntitlementResponseData;

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    const { rerender } = render(
      <Entitlement
        entitlement={mockEntitlement}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("1 User")).toBeInTheDocument();

    rerender(
      <Entitlement
        entitlement={{ ...mockEntitlement, valueNumeric: 5 }}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("5 Users")).toBeInTheDocument();
  });

  test("doesn't show credit-based entitlements when `showCredits` is 'false'", () => {
    const mockEntitlement = {
      id: "ent-7",
      feature: {
        id: "feat-7",
        name: "API Call",
        icon: "api",
      },
      priceBehavior: PriceBehavior.Credit,
      valueType: EntitlementValueType.Credit,
      valueCredit: {
        id: "credit-2",
        name: "API Credits",
        icon: "credit",
      },
      consumptionRate: 1,
    } as PlanEntitlementResponseData;

    const mockCredits = [
      {
        id: "credit-2",
        name: "API Credits",
        icon: "credit",
        quantity: 5000,
        period: "month",
      } satisfies DeepPartial<Credit> as Credit,
    ];

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
        credits={mockCredits}
        showCredits={false}
        sharedProps={mockSharedProps}
      />,
    );

    expect(
      screen.queryByText("1 API Credit per API Call"),
    ).not.toBeInTheDocument();
    expect(
      screen.getByText("Up to 5,000 API Calls per month"),
    ).toBeInTheDocument();
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
      priceBehavior: "pay_as_you_go",
      meteredMonthlyPrice: {
        price: 1,
        priceDecimal: "1",
        currency: "usd",
        priceTier: [
          {
            perUnitPrice: 1,
            perUnitPriceDecimal: "1",
          },
        ],
      },
    } as PlanEntitlementResponseData;

    const mockSharedProps = {
      layout: {
        plans: {
          showFeatureIcons: true,
          showFeatureDescriptions: false,
        },
      },
    } as SharedProps;

    render(
      <Entitlement
        entitlement={mockEntitlement}
        sharedProps={mockSharedProps}
      />,
    );

    expect(screen.getByText("$0.01 per API Call")).toBeInTheDocument();
  });
});
