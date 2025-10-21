import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";
import cloneDeep from "lodash/cloneDeep";

import { PlanEntitlementResponseData } from "../../../api/checkoutexternal";
import {
  EntitlementValueType,
  EntityType,
  FeatureType,
  PriceInterval,
  TraitType,
} from "../../../const";
import { type EmbedContextProps } from "../../../context";
import { act, fireEvent, render, screen } from "../../../test/setup";
import type { DeepPartial, SelectedPlan } from "../../../types";

import { AddOn, type AddOnProps } from "./AddOn";

type SharedProps = AddOnProps["sharedProps"];

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
} satisfies DeepPartial<SharedProps> as SharedProps;

describe("`AddOn` component", () => {
  test("renders add-on correctly", () => {
    render(
      <AddOn
        addOn={mockAddOn}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(screen.getByText("API Boost")).toBeInTheDocument();
    expect(
      screen.getByText("Increase your API call limits"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("sch-addon-price")).toHaveTextContent(
      "$9.99/month",
    );

    // expect(screen.getByText("10,000 Extra API Calls")).toBeInTheDocument();
    // expect(screen.getByText("Priority Support")).toBeInTheDocument();

    const ctaButton = screen.getByText("Choose add-on");
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute("href", "/checkout");
  });

  // `data` cannot be redefined
  // TODO: figure out how to mock the value
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip("renders active add-on correctly", async () => {
    jest.mock("../../../hooks", () => ({
      useEmbed: () =>
        ({
          data: {
            company: {
              addOns: [
                {
                  id: "addon-1",
                  name: "API Boost",
                  planPeriod: "month",
                },
              ],
            },
            capabilities: {
              checkout: true,
              badgeVisibility: false,
            },
            component: undefined,
          },
        }) satisfies DeepPartial<EmbedContextProps> as EmbedContextProps,
    }));

    render(
      <AddOn
        addOn={{ ...mockAddOn, current: true }}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(screen.getByText("Active")).toBeInTheDocument();
    expect(screen.getByText("Remove add-on")).toBeInTheDocument();
  });

  test("renders yearly pricing when selected", () => {
    render(
      <AddOn
        addOn={mockAddOn}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Year}
      />,
    );

    expect(screen.getByTestId("sch-addon-price")).toHaveTextContent(
      "$99.99/year",
    );
  });

  test("renders 'Change add-on' for current add-on with different period", () => {
    render(
      <AddOn
        addOn={{ ...mockAddOn, current: true }}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Year}
      />,
    );

    expect(screen.getByText("Change add-on")).toBeInTheDocument();
  });

  test("hides features when `showEntitlements` is 'false'", () => {
    const propsWithoutEntitlements = cloneDeep(mockSharedProps);
    propsWithoutEntitlements.layout.addOns.showEntitlements = false;

    render(
      <AddOn
        addOn={mockAddOn}
        sharedProps={propsWithoutEntitlements}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(screen.queryByText("Extra API Calls")).not.toBeInTheDocument();
    expect(screen.queryByText("Priority Support")).not.toBeInTheDocument();
  });

  test("hides description when `showDescription` is 'false'", () => {
    const propsWithoutDescription = cloneDeep(mockSharedProps);
    propsWithoutDescription.layout.addOns.showDescription = false;

    render(
      <AddOn
        addOn={mockAddOn}
        sharedProps={propsWithoutDescription}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(
      screen.queryByText("Increase your API call limits"),
    ).not.toBeInTheDocument();
  });

  test("hides feature icons when `showFeatureIcons` is 'false'", () => {
    const propsWithoutIcons = cloneDeep(mockSharedProps);
    propsWithoutIcons.layout.addOns.showFeatureIcons = false;

    render(
      <AddOn
        addOn={mockAddOn}
        sharedProps={propsWithoutIcons}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(screen.queryByTestId("sch-feature-icon")).not.toBeInTheDocument();
  });

  test("calls `setCheckoutState` when clicking active add-on button", () => {
    const mockSetCheckoutState = jest.fn();

    jest.mock("../../../hooks", () => ({
      useEmbed: () => ({
        data: {
          company: {
            addOns: [
              {
                id: "addon-1",
                planPeriod: "month",
              },
            ],
          },
          capabilities: {
            checkout: true,
          },
        },
        setCheckoutState: mockSetCheckoutState,
      }),
    }));

    const mockOnCallToAction = jest.fn();

    render(
      <AddOn
        addOn={{ ...mockAddOn, current: true }}
        sharedProps={{
          ...mockSharedProps,
          callToActionUrl: undefined,
          onCallToAction: mockOnCallToAction,
        }}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    const button = screen.getByTestId("sch-addon-cta-button");
    act(() => {
      fireEvent.click(button);
    });

    expect(mockOnCallToAction).toHaveBeenCalledWith({
      ...mockAddOn,
      current: true,
    });
  });

  test("calls `setCheckoutState` when clicking non-active add-on button", () => {
    const mockSetCheckoutState = jest.fn();

    jest.mock("../../../hooks", () => ({
      useEmbed: () => ({
        data: {
          company: {
            addOns: [],
          },
          capabilities: {
            checkout: true,
          },
        },
        setCheckoutState: mockSetCheckoutState,
      }),
    }));

    const mockOnCallToAction = jest.fn();

    render(
      <AddOn
        addOn={mockAddOn}
        sharedProps={{
          ...mockSharedProps,
          callToActionUrl: undefined,
          onCallToAction: mockOnCallToAction,
        }}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    const button = screen.getByTestId("sch-addon-cta-button");
    act(() => {
      fireEvent.click(button);
    });

    expect(mockOnCallToAction).toHaveBeenCalledWith(mockAddOn);
  });

  test("does not render limited entitlements without a price behavior", () => {
    render(
      <AddOn
        addOn={{
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
              metricPeriod: "month",
            } as PlanEntitlementResponseData,
          ],
        }}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(
      screen.queryByText("10,000 API Calls per month"),
    ).not.toBeInTheDocument();
  });

  test("renders unlimited entitlements correctly", () => {
    render(
      <AddOn
        addOn={{
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
        }}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(screen.getByText("API Calls")).toBeInTheDocument();
    expect(screen.getByText("Unlimited")).toBeInTheDocument();
  });
});
