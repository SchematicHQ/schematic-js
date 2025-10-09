import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";
import cloneDeep from "lodash/cloneDeep";
import { HttpResponse, http } from "msw";

import hydrateJson from "~/test/mocks/handlers/response/hydrate.json";
import plansJson from "~/test/mocks/handlers/response/plans.json";
import { server } from "~/test/mocks/node";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
  waitForElementToBeRemoved,
  within,
} from "~/test/setup";

import { PricingTable } from ".";

describe("`PricingTable` integration and edge cases", () => {
  test("handles API errors gracefully", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        return new HttpResponse(null, { status: 500 });
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    const loading = screen.queryByLabelText("loading");
    expect(loading).toBeInTheDocument();

    await waitForElementToBeRemoved(loading);

    const wrapper = screen.queryByTestId("sch-pricing-table");
    expect(wrapper).toBeInTheDocument();
  });

  test("renders when only one period is available", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = cloneDeep(plansJson);

        for (const plan of response.data.active_plans) {
          // @ts-expect-error: the inferred type from `plansJson` is not nullable
          plan.yearly_price = null;
        }

        for (const addOn of response.data.active_add_ons) {
          // the inferred type from `plansJson` is not nullable
          addOn.yearly_price = null;
        }

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    const wrapper = await screen.findByTestId("sch-pricing-table");
    expect(wrapper).toBeInTheDocument();

    const billedMonthlyText = screen.queryByText("Billed monthly");
    expect(billedMonthlyText).not.toBeInTheDocument();

    const billedYearlyText = screen.queryByText("Billed yearly");
    expect(billedYearlyText).not.toBeInTheDocument();

    const plans = screen.queryAllByTestId("sch-plan");
    expect(plans).toHaveLength(4);

    const monthlyPeriodText = within(plans[0]).getByText("/month");
    expect(monthlyPeriodText).toBeInTheDocument();
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

    const wrapper = await screen.findByTestId("sch-pricing-table");
    expect(wrapper).toBeInTheDocument();

    const plansHeaderText = within(wrapper).queryByText("Plans");
    expect(plansHeaderText).toHaveStyleRule(
      "font-family",
      "Manrope,sans-serif",
    );
    expect(plansHeaderText).toHaveStyleRule("font-size", `${37 / 16}rem`);
    expect(plansHeaderText).toHaveStyleRule("font-weight", "800");
    expect(plansHeaderText).toHaveStyleRule("color", "#000000");

    const plans = within(wrapper).queryAllByTestId("sch-plan");

    const planNameText = within(plans[0]).queryByText("Basic");
    expect(planNameText).toHaveStyleRule("font-family", "Manrope,sans-serif");
    expect(planNameText).toHaveStyleRule("font-size", `${37 / 16}rem`);
    expect(planNameText).toHaveStyleRule("font-weight", "800");
    expect(planNameText).toHaveStyleRule("color", "#000000");

    const planDescriptionText = within(plans[0]).queryByText("A basic plan");
    expect(planDescriptionText).toHaveStyleRule(
      "font-family",
      "Public Sans,sans-serif",
    );
    expect(planDescriptionText).toHaveStyleRule("font-size", `${14 / 16}rem`);
    expect(planDescriptionText).toHaveStyleRule("font-weight", "400");
    expect(planDescriptionText).toHaveStyleRule("color", "#8A8A8A");
  });

  test("handles missing plan descriptions gracefully", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = cloneDeep(plansJson);

        for (const plan of response.data.active_plans) {
          // @ts-expect-error: the inferred type from `plansJson` is not nullable
          plan.description = null;
        }

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    const plans = await screen.findAllByTestId("sch-plan");
    expect(plans[0]).toBeInTheDocument();

    const planDescriptionText = within(plans[0]).queryByText("A basic plan");
    expect(planDescriptionText).not.toBeInTheDocument();
  });

  test("handles mixed currency plans gracefully", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = cloneDeep(plansJson);

        response.data.active_plans[0].monthly_price.currency = "usd";
        response.data.active_plans[0].yearly_price.currency = "usd";

        response.data.active_plans[1].monthly_price.currency = "eur";
        response.data.active_plans[1].yearly_price.currency = "eur";

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    const plans = await screen.findAllByTestId("sch-plan");

    const firstPlanPrice = await within(plans[0]).findByTestId(
      "sch-plan-price",
    );
    expect(firstPlanPrice).toHaveTextContent("$5.00/month");

    const secondPlanPrice = await within(plans[1]).findByTestId(
      "sch-plan-price",
    );
    expect(secondPlanPrice).toHaveTextContent("€10.00/month");
  });

  test("renders plans with very large prices properly", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = cloneDeep(plansJson);

        const plan = response.data.active_plans[0];
        plan.monthly_price.price = 999999999;
        plan.monthly_price.price_decimal = "999999999";

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    const plans = await screen.findAllByTestId("sch-plan");

    // the exact format may vary based on locale but it should include commas
    const firstPlanPrice = await within(plans[0]).findByTestId(
      "sch-plan-price",
    );
    expect(firstPlanPrice).toHaveTextContent("$9,999,999.99/month");
  });

  test("renders properly when plans have no features", async () => {
    server.use(
      http.get("https://api.schematichq.com/public/plans", async () => {
        const response = cloneDeep(plansJson);

        for (const plan of response.data.active_plans) {
          plan.entitlements = [];
        }

        return HttpResponse.json(response);
      }),
    );

    render(<PricingTable callToActionUrl="/" />);

    await waitFor(() =>
      expect(screen.queryByLabelText("loading")).not.toBeInTheDocument(),
    );

    const plans = await screen.findAllByTestId("sch-plan");
    expect(plans).toHaveLength(4);

    const seeAllText = screen.queryByText("See all");
    expect(seeAllText).not.toBeInTheDocument();
  });
});
