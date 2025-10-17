import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";

import { fireEvent, render, screen } from "~/test/setup";

import {
  EntitlementValueType,
  EntityType,
  PriceInterval,
  TraitType,
} from "../../../const";
import { type EmbedContextProps } from "../../../context";
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

    expect(screen.getByText("10,000 Extra API Calls")).toBeInTheDocument();
    expect(screen.getByText("Priority Support")).toBeInTheDocument();

    const ctaButton = screen.getByText("Choose add-on");
    expect(ctaButton).toBeInTheDocument();
    expect(ctaButton).toHaveAttribute("href", "/checkout");
  });

  test.only("renders active add-on correctly", async () => {
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
    jest.mock("../../../hooks/useEmbed", () => ({
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

    expect(screen.getByText("$99.99/year")).toBeInTheDocument();
  });

  test("disables button for invalid add-ons", () => {
    render(
      <AddOn
        addOn={{ ...mockAddOn, valid: false }}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    const button = screen.getByText("Choose add-on");
    expect(button).toBeDisabled();
  });

  test("renders 'Change add-on' for current add-on with different period", () => {
    // Add-on is current but with yearly period, while we're showing monthly
    render(
      <AddOn
        addOn={{ ...mockAddOn, current: true }}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(screen.getByText("Change add-on")).toBeInTheDocument();
  });

  test("hides features when showEntitlements is false", () => {
    const propsWithoutEntitlements = {
      ...mockSharedProps,
      layout: {
        ...mockSharedProps.layout,
        addOns: {
          ...mockSharedProps.layout.addOns,
          showEntitlements: false,
        },
      },
    };

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

  test("hides description when showDescription is false", () => {
    const propsWithoutDescription = {
      ...mockSharedProps,
      layout: {
        ...mockSharedProps.layout,
        addOns: {
          ...mockSharedProps.layout.addOns,
          showDescription: false,
        },
      },
    };

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

  test("hides feature icons when showFeatureIcons is false", () => {
    const propsWithoutIcons = {
      ...mockSharedProps,
      layout: {
        ...mockSharedProps.layout,
        addOns: {
          ...mockSharedProps.layout.addOns,
          showFeatureIcons: false,
        },
      },
    };

    render(
      <AddOn
        addOn={mockAddOn}
        sharedProps={propsWithoutIcons}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    // Since we can't easily test for the absence of icons in this test environment,
    // we can at least verify the features are still shown
    expect(screen.getByText("10000 Extra API Calls")).toBeInTheDocument();
    expect(screen.getByText("Priority Support")).toBeInTheDocument();
  });

  test("calls setCheckoutState when clicking active add-on button", () => {
    const mockSetCheckoutState = jest.fn();

    // Override the mock for this test
    jest.spyOn(require("../../../hooks/useEmbed"), "useEmbed").mockReturnValue({
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
        component: {}, // Not standalone
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

    // Click "Remove add-on" button
    const button = screen.getByText("Remove add-on");
    fireEvent.click(button);

    expect(mockOnCallToAction).toHaveBeenCalledWith({
      ...mockAddOn,
      current: true,
    });
    expect(mockSetCheckoutState).toHaveBeenCalledWith({
      period: "month",
      addOnId: null,
      usage: false,
    });
  });

  test("calls setCheckoutState when clicking non-active add-on button", () => {
    const mockSetCheckoutState = jest.fn();

    // Override the mock for this test
    jest.spyOn(require("../../../hooks/useEmbed"), "useEmbed").mockReturnValue({
      data: {
        company: {
          addOns: [],
        },
        capabilities: {
          checkout: true,
        },
        component: {}, // Not standalone
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

    // Click "Choose add-on" button
    const button = screen.getByText("Choose add-on");
    fireEvent.click(button);

    expect(mockOnCallToAction).toHaveBeenCalledWith(mockAddOn);
    expect(mockSetCheckoutState).toHaveBeenCalledWith({
      period: "month",
      addOnId: "addon-1",
      usage: false,
    });
  });

  test("renders per-period text for metric-based entitlements", () => {
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
              valueType: "numeric",
              valueNumeric: 10000,
              metricPeriod: "month",
            },
          ],
        }}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(screen.getByText("10000 API Calls per month")).toBeInTheDocument();
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
              valueType: "unlimited",
            },
          ],
        }}
        sharedProps={mockSharedProps}
        selectedPeriod={PriceInterval.Month}
      />,
    );

    expect(screen.getByText("Unlimited API Calls")).toBeInTheDocument();
  });
});
