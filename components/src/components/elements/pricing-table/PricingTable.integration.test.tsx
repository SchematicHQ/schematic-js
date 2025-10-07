import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";
import merge from "lodash/merge";
import { HttpResponse, http } from "msw";

import hydrateJson from "~/test/mocks/handlers/response/hydrate.json";
import plansJson from "~/test/mocks/handlers/response/plans.json";
import { server } from "~/test/mocks/node";
import { act, fireEvent, render, screen, waitFor, within } from "~/test/setup";

import { PricingTable } from ".";

describe("`PricingTable` integration and edge cases", () => {
  test("handles API errors gracefully", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    expect(screen.queryByLabelText("loading")).toBeInTheDocument();

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByTestId("sch-pricing-table")).toBeInTheDocument();

    // TODO: add better error state testing
  });

  test("renders when only one period is available", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        for (const plan of response.data.active_plans) {
          merge(plan, { yearly_price: null });
        }
        for (const addOn of response.data.active_add_ons) {
          merge(addOn, { yearly_price: null });
        }
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const monthButton = screen.queryByText("Billed monthly");
    expect(monthButton).not.toBeInTheDocument();

    const yearButton = screen.queryByText("Billed yearly");
    expect(yearButton).not.toBeInTheDocument();

    const planElements = screen.queryAllByTestId("sch-plan");
    expect(planElements.length).toBeGreaterThan(0);
    expect(within(planElements[0]).getByText("/month")).toBeInTheDocument();
  });

  test("renders with custom font styles", async () => {
    render(
      <PricingTable
        callToActionUrl="/"
        header={{ fontStyle: "heading1" }}
        plans={{
          name: { fontStyle: "heading1" },
          description: { fontStyle: "heading6" },
        }}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // TODO: check for provided styles
  });

  test.only("handles missing plan descriptions gracefully", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = merge({}, plansJson);
        for (const plan of response.data.active_plans) {
          merge(plan, { description: null });
        }
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // Should still render plans without descriptions
    const planElements = screen.queryAllByTestId("sch-plan");
    expect(planElements.length).toBeGreaterThan(0);
  });

  test("handles mixed currency plans gracefully", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = { ...plansJson };
        // Set different currencies for some plans
        if (response.data.active_plans.length > 1) {
          response.data.active_plans[0].monthly_price.currency = "USD";
          response.data.active_plans[0].yearly_price.currency = "USD";

          response.data.active_plans[1].monthly_price.currency = "EUR";
          response.data.active_plans[1].yearly_price.currency = "EUR";
        }
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // Should render plans with different currencies
    const planElements = screen.queryAllByTestId("sch-plan");
    expect(planElements.length).toBeGreaterThan(1);

    // First plan should show USD
    const firstPlanPrice = within(planElements[0]).getByText(/\$\d+\/month/);
    expect(firstPlanPrice).toBeInTheDocument();

    // Second plan should show EUR
    const secondPlanPrice = within(planElements[1]).getByText(/€\d+\/month/);
    expect(secondPlanPrice).toBeInTheDocument();
  });

  test("renders plans with very large prices properly", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = { ...plansJson };
        // Set a very large price
        response.data.active_plans[0].monthly_price.price = 9999999.99;
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // Should handle large price formatting properly
    const planElements = screen.queryAllByTestId("sch-plan");

    // The exact format may vary based on locale, but it should include commas
    const firstPlanPrice = within(planElements[0]).getByText(
      /\$9,999,999.99\/month/,
    );
    expect(firstPlanPrice).toBeInTheDocument();
  });

  test("renders with custom plan button when onCallToAction is provided", async () => {
    const mockOnCallToAction = jest.fn();

    render(<PricingTable onCallToAction={mockOnCallToAction} />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // Get plan buttons and click the first one
    const buttons = screen.getAllByTestId("sch-plan-cta-button");
    fireEvent.click(buttons[0]);

    // onCallToAction should be called
    expect(mockOnCallToAction).toHaveBeenCalledTimes(1);
  });

  test("renders with both callToActionUrl and onCallToAction", async () => {
    const mockOnCallToAction = jest.fn();

    render(
      <PricingTable
        callToActionUrl="/checkout"
        onCallToAction={mockOnCallToAction}
      />,
    );

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // Plan buttons should have the URL since callToActionUrl takes precedence
    const buttons = screen.getAllByTestId("sch-plan-cta-button");
    expect(buttons[0]).toHaveAttribute("href", "/checkout");

    // Click should not trigger onCallToAction when URL is provided
    fireEvent.click(buttons[0]);
    expect(mockOnCallToAction).not.toHaveBeenCalled();
  });

  test("handles calling useEmbed hydration on standalone mode", async () => {
    // We can't directly test this, but we can ensure the component renders
    // when in standalone mode (no component data)
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = { ...plansJson };
        delete response.data.component;
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    expect(screen.queryByTestId("sch-pricing-table")).toBeInTheDocument();
  });

  test("selects proper period based on plan price availability", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = { ...plansJson };
        // First plan only has monthly price
        response.data.active_plans[0].yearly_price = null;
        // Second plan only has yearly price
        if (response.data.active_plans.length > 1) {
          response.data.active_plans[1].monthly_price = null;
        }
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const planElements = screen.queryAllByTestId("sch-plan");
    expect(planElements.length).toBeGreaterThan(1);

    // First plan should show monthly pricing
    const firstPlanPrice = within(planElements[0]).getByText(/\/month/);
    expect(firstPlanPrice).toBeInTheDocument();

    // Second plan should show yearly pricing
    const secondPlanPrice = within(planElements[1]).getByText(/\/year/);
    expect(secondPlanPrice).toBeInTheDocument();

    // Toggle to yearly pricing
    const periodToggle = screen.getByRole("radiogroup");
    const yearOption = within(periodToggle).getByLabelText("year");

    act(() => {
      fireEvent.click(yearOption);
    });

    // First plan should still show monthly pricing (as it has no yearly price)
    await waitFor(() => {
      const firstPlanAfterToggle = within(planElements[0]).getByText(/\/month/);
      expect(firstPlanAfterToggle).toBeInTheDocument();
    });
  });

  test("renders properly when plans have no features", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = { ...plansJson };
        // Remove all features from plans
        response.data.active_plans.forEach((plan: any) => {
          plan.entitlements = [];
        });
        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    // Should still render plans without features
    const planElements = screen.queryAllByTestId("sch-plan");
    expect(planElements.length).toBeGreaterThan(0);

    // "See all" button should not be present
    expect(screen.queryByText("See all")).not.toBeInTheDocument();
  });
});
