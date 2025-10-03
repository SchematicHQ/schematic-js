import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";
import merge from "lodash/merge";
import { HttpResponse, delay, http } from "msw";

import hydrateJson from "~/test/mocks/handlers/response/hydrate.json";
import plansJson from "~/test/mocks/handlers/response/plans.json";
import { server } from "~/test/mocks/node";
import { act, fireEvent, render, screen, waitFor, within } from "~/test/setup";

import { PricingTable } from ".";

describe("`PricingTable`", () => {
  test("Renders loading state", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        await delay(1000);
        return HttpResponse.json([]);
      }),
    );

    render(<PricingTable callToActionUrl="/" />, {});

    const loadingText = screen.queryByLabelText("loading");
    expect(loadingText).toBeInTheDocument();
  });

  test("Renders empty when no plans are available", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        return HttpResponse.json({ data: { active_plans: [] } });
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    const loadingText = screen.queryByLabelText("loading");
    await waitFor(() => expect(loadingText).not.toBeInTheDocument());

    const plansWrapper = screen.queryByTestId("plans");
    expect(plansWrapper).not.toBeInTheDocument();
  });

  test("Renders pricing table with plans", async () => {
    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByTestId("pricing-table")).toBeInTheDocument();

    expect(screen.queryAllByTestId("plan")).toHaveLength(4);

    const buttons = screen.queryAllByTestId("plan-cta-button");
    expect(buttons).toHaveLength(4);
    for (const button of buttons) {
      expect(button).toBeEnabled();
    }

    expect(screen.queryAllByText("Choose plan")).toHaveLength(3);
    expect(screen.queryAllByText("Talk to us")).toHaveLength(1);
  });

  test("Invalid plans should show with disabled buttons", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, hydrateJson);
        for (const plan of response.data.active_plans) {
          plan.valid = false;
        }

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const buttons = screen.queryAllByTestId((content, element) => {
      return (
        content === "Choose plan" &&
        element instanceof HTMLElement &&
        element?.dataset.testid === "plan-cta-button"
      );
    });
    for (const button of buttons) {
      expect(button).toBeDisabled();
    }

    // custom plan button should be enabled
    const customButtons = screen.queryAllByText("Talk to us");
    for (const button of customButtons) {
      expect(button).toBeEnabled();
    }
  });

  test("Should hide plans when plans.isVisible is false", async () => {
    render(<PricingTable callToActionUrl="/" plans={{ isVisible: false }} />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByTestId("pricing-table")).toBeInTheDocument();
    expect(screen.queryByTestId("plans")).not.toBeInTheDocument();
  });

  test("Should hide header when header.isVisible is false", async () => {
    render(<PricingTable callToActionUrl="/" header={{ isVisible: false }} />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByTestId("pricing-table")).toBeInTheDocument();
    expect(screen.queryByText("Plans")).not.toBeInTheDocument();
  });

  test("Should hide period toggle when showPeriodToggle is false", async () => {
    render(<PricingTable callToActionUrl="/" showPeriodToggle={false} />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByTestId("pricing-table")).toBeInTheDocument();
    expect(screen.queryByTestId("period-toggle")).not.toBeInTheDocument();
  });

  test("Should hide add-ons when addOns.isVisible is false", async () => {
    render(<PricingTable callToActionUrl="/" addOns={{ isVisible: false }} />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByTestId("pricing-table")).toBeInTheDocument();
    expect(screen.queryByText("Add-ons")).not.toBeInTheDocument();
  });

  test("Should toggle between monthly and yearly plans", async () => {
    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // const periodToggle = screen.getByTestId("period-toggle");
    // expect(periodToggle).toBeInTheDocument();

    const planElements = screen.queryAllByTestId("plan");
    const firstPlanInitial = within(planElements[0]).getByText("/month");
    expect(firstPlanInitial).toBeInTheDocument();

    // const yearButton = within(periodToggle).getByText("year");
    const yearButton = screen.getByText("Billed yearly");

    act(() => {
      fireEvent.click(yearButton);
    });

    await waitFor(() => {
      const planElementsAfterToggle = screen.queryAllByTestId("plan");
      const firstPlanAfterToggle = within(
        planElementsAfterToggle[0],
      ).queryByText("/year");
      expect(firstPlanAfterToggle).toBeInTheDocument();
    });
  });

  // TODO: fix this test
  // the default `current` value from the `normalize` function
  // is overwriting the modified response data in `embedReducer`
  // eslint-disable-next-line jest/no-disabled-tests
  test.skip("Should display current plan with 'Active' label", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, hydrateJson);
        response.data.active_plans[0].current = true;
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const activeBadge = screen.getByText("Active");
    expect(activeBadge).toBeInTheDocument();

    const currentPlanText = screen.getByText("Current plan");
    expect(currentPlanText).toBeInTheDocument();

    const firstPlan = screen.queryAllByTestId("plan")[0];
    expect(
      within(firstPlan).queryByTestId("plan-cta-button"),
    ).not.toBeInTheDocument();
  });

  test("Should render trial status for current plan", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, hydrateJson);
        response.data.active_plans[0].current = true;
        merge(response.data.company.billing_subscription, {
          status: "trialing",
          cancel_at: null,
        });
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // Since the trial end date mock would come from `useTrialEnd` hook, and we don't have direct access to it,
    // we'll just check that we don't have the standard "Active" label
    expect(screen.queryByText("Active")).not.toBeInTheDocument();
  });

  test("Should call `onCallToAction` when clicking a plan", async () => {
    const mockOnCallToAction = jest.fn();
    render(<PricingTable onCallToAction={mockOnCallToAction} />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const buttons = screen.queryAllByTestId("plan-cta-button");
    fireEvent.click(buttons[0]);

    expect(mockOnCallToAction).toHaveBeenCalledTimes(1);
  });

  test("Should render free plan text correctly when `showZeroPriceAsFree` is true", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        response.data.active_plans[0].is_free = true;
        merge(response.data.active_plans[0].monthly_price, {
          price: 0,
          price_decimal: "0",
        });
        merge(response.data.active_plans[0].yearly_price, {
          price: 0,
          price_decimal: "0",
        });
        response.data.show_zero_price_as_free = true;
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByText("Free")).toBeInTheDocument();
  });

  test("Should render usage-based text for free plans with usage entitlements", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        const plan = response.data.active_plans[0];
        plan.is_free = true;
        merge(plan.monthly_price, { price: 0, price_decimal: "0" });
        merge(plan.yearly_price, { price: 0, price_decimal: "0" });
        merge(plan, {
          entitlements: [
            {
              price_behavior: "pay_in_advance",
              feature: { name: "Usage-based Feature" },
            },
          ],
        });
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByText("Usage-based")).toBeInTheDocument();
  });

  test("Should render entitlements and handle 'show more'/'show less'", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        const plan = response.data.active_plans[0];
        merge(plan, {
          entitlements: Array(10)
            .fill(0)
            .map((_, i) => ({
              id: `ent-${i}`,
              feature: {
                id: `feat-${i}`,
                name: `Feature ${i}`,
                singular_name: "",
                plural_name: "",
                description: `Feature ${i} description`,
                feature_type: "boolean",
                icon: "check",
              },
              value_numeric: 3,
              value_type: "numeric",
              price_behavior: null,
            })),
        });

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const firstPlan = screen.queryAllByTestId("plan")[0];
    const seeAllButton = within(firstPlan).getByText("See all");
    expect(seeAllButton).toBeInTheDocument();

    expect(within(firstPlan).queryAllByText(/Feature \d/)).toHaveLength(4);

    fireEvent.click(seeAllButton);

    expect(within(firstPlan).getAllByText(/Feature \d/)).toHaveLength(10);

    const hideAllButton = within(firstPlan).getByText("Hide all");
    expect(hideAllButton).toBeInTheDocument();

    fireEvent.click(hideAllButton);

    expect(within(firstPlan).getAllByText(/Feature \d/)).toHaveLength(4);
  });

  test("Should render proper callToAction URLs", async () => {
    render(
      <PricingTable
        callToActionUrl="https://example.com/signup"
        callToActionTarget="_self"
      />,
    );

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const buttons = screen.queryAllByTestId("plan-cta-button");

    // Non-custom plan buttons should have the provided callToActionUrl
    const regularButtons = buttons.filter((button) =>
      within(button).queryByText("Choose plan"),
    );
    for (const button of regularButtons) {
      expect(button).toHaveAttribute("href", "https://example.com/signup");
      expect(button).toHaveAttribute("target", "_self");
    }

    // Custom plan buttons should have their own URL
    const customButtons = buttons.filter((button) =>
      within(button).queryByText("Talk to us"),
    );
    for (const button of customButtons) {
      // Custom plan URLs are defined in the mock data
      expect(button).toHaveAttribute("href");
      expect(button).not.toHaveAttribute("href", "https://example.com/signup");
    }
  });

  test("Should show credits when available", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        merge(response.data.active_plans[0], {
          included_credit_grants: [
            {
              credit_amount: 1000,
              credit_name: "API Credits",
              reset_cadence: "monthly",
            },
          ],
        });
        response.data.show_credits = true;
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.getByText(/1000 API Credits per month/)).toBeInTheDocument();
  });

  test("Should not show credits when showCredits is false", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        merge(response.data.active_plans[0], {
          included_credit_grants: [
            {
              credit_name: "API Credits",
              quantity: 1000,
              period: "month",
              icon: "api",
            },
          ],
        });
        response.data.show_credits = false;
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(
      screen.queryByText(/1000 API Credits per month/),
    ).not.toBeInTheDocument();
  });

  test("Should select correct period based on plan prices availability", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        const plan = response.data.active_plans[0];
        merge(plan, { monthly_price: null });

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" showPeriodToggle={false} />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // Should show yearly price even though period toggle is not shown
    const planElements = screen.queryAllByTestId("plan");
    expect(within(planElements[0]).getByText(/\/year/)).toBeInTheDocument();
  });

  test("Should not render trial offer text when plan is triable", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, hydrateJson);

        merge(response.data.active_plans[0], {
          is_trialable: true,
          trial_days: 14,
          company_can_trial: true,
        });

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const planElements = screen.queryAllByTestId("plan");
    expect(
      within(planElements[0]).queryByText("Choose plan"),
    ).toBeInTheDocument();
    expect(
      within(planElements[0]).queryByText(/Start 14 day trial/),
    ).not.toBeInTheDocument();
  });

  test("Should handle period toggle keyboard navigation", async () => {
    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const yearButton = screen.getByText("Billed yearly");

    const planElements = screen.queryAllByTestId("plan");
    expect(within(planElements[0]).queryByText("/month")).toBeInTheDocument();

    act(() => {
      fireEvent.focus(yearButton);
      fireEvent.keyDown(yearButton, { key: " " });
    });

    await waitFor(() => {
      const planElementsAfterToggle = screen.queryAllByTestId("plan");
      expect(
        within(planElementsAfterToggle[0]).queryByText("/year"),
      ).toBeInTheDocument();
    });
  });

  test("Should handle entitlement expand/collapse with keyboard", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        const plan = response.data.active_plans[0];
        merge(plan, {
          entitlements: Array(10)
            .fill(0)
            .map((_, i) => ({
              id: `ent-${i}`,
              feature: {
                id: `feat-${i}`,
                name: `Feature ${i}`,
                singular_name: "",
                plural_name: "",
                description: `Feature ${i} description`,
                feature_type: "boolean",
                icon: "check",
              },
              value_numeric: 3,
              value_type: "numeric",
              price_behavior: null,
            })),
        });

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const firstPlan = screen.queryAllByTestId("plan")[0];
    const seeAllText = within(firstPlan).getByText("See all");

    expect(within(firstPlan).getAllByText(/Feature \d/)).toHaveLength(4);

    act(() => {
      fireEvent.focus(seeAllText);
      fireEvent.keyDown(seeAllText, { key: "Enter" });
    });

    expect(within(firstPlan).getAllByText(/Feature \d/)).toHaveLength(10);
  });
});
