import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";
import cloneDeep from "lodash/cloneDeep";
import { HttpResponse, delay, http } from "msw";

import hydrateJson from "~/test/mocks/handlers/response/hydrate.json";
import plansJson from "~/test/mocks/handlers/response/plans.json";
import { server } from "~/test/mocks/node";
import { act, fireEvent, render, screen, waitFor, within } from "~/test/setup";

import { SchematicEmbed } from "../../embed";

import { PricingTable } from ".";

jest.mock("../../../hooks/useTrialEnd", () => ({
  useTrialEnd: () => {
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 14);

    return {
      endDate,
      formatted: "Trial ends in 14 days",
    };
  },
}));

describe("`PricingTable`", () => {
  describe("public/standalone mode", () => {
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

      const plansWrapper = screen.queryByTestId("sch-plans");
      expect(plansWrapper).not.toBeInTheDocument();
    });

    test("Renders pricing table with plans", async () => {
      render(<PricingTable callToActionUrl="/" />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(screen.queryByTestId("sch-pricing-table")).toBeInTheDocument();

      expect(screen.queryAllByTestId("sch-plan")).toHaveLength(4);

      const buttons = screen.queryAllByTestId("sch-plan-cta-button");
      expect(buttons).toHaveLength(4);
      for (const button of buttons) {
        expect(button).toBeEnabled();
      }

      expect(screen.queryAllByText("Choose plan")).toHaveLength(3);
      expect(screen.queryAllByText("Talk to us")).toHaveLength(1);
    });

    test("Should hide plans when `plans.isVisible` is false", async () => {
      render(<PricingTable callToActionUrl="/" plans={{ isVisible: false }} />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(screen.queryByTestId("sch-pricing-table")).toBeInTheDocument();
      expect(screen.queryByTestId("sch-plans")).not.toBeInTheDocument();
    });

    test("Should hide header when header.isVisible is false", async () => {
      render(
        <PricingTable callToActionUrl="/" header={{ isVisible: false }} />,
      );

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(screen.queryByTestId("sch-pricing-table")).toBeInTheDocument();
      expect(screen.queryByText("Plans")).not.toBeInTheDocument();
    });

    test("Should hide period toggle when showPeriodToggle is false", async () => {
      render(<PricingTable callToActionUrl="/" showPeriodToggle={false} />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(screen.queryByTestId("sch-pricing-table")).toBeInTheDocument();
      expect(screen.queryByTestId("sch-period-toggle")).not.toBeInTheDocument();
    });

    test("Should hide add-ons when addOns.isVisible is false", async () => {
      render(
        <PricingTable callToActionUrl="/" addOns={{ isVisible: false }} />,
      );

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(screen.queryByTestId("sch-pricing-table")).toBeInTheDocument();
      expect(screen.queryByText("Add-ons")).not.toBeInTheDocument();
    });

    test("Should toggle between monthly and yearly plans", async () => {
      render(<PricingTable callToActionUrl="/" />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      // const periodToggle = screen.getByTestId("sch-period-toggle");
      // expect(periodToggle).toBeInTheDocument();

      const planElements = screen.queryAllByTestId("sch-plan");
      const firstPlanInitial = within(planElements[0]).getByText("/month");
      expect(firstPlanInitial).toBeInTheDocument();

      // const yearButton = within(periodToggle).getByText("year");
      const yearButton = screen.getByText("Billed yearly");

      act(() => {
        fireEvent.click(yearButton);
      });

      await waitFor(() => {
        const planElementsAfterToggle = screen.queryAllByTestId("sch-plan");
        const firstPlanAfterToggle = within(
          planElementsAfterToggle[0],
        ).queryByText("/year");
        expect(firstPlanAfterToggle).toBeInTheDocument();
      });
    });

    test("Should call `onCallToAction` when clicking a plan", async () => {
      const mockOnCallToAction = jest.fn();
      render(<PricingTable onCallToAction={mockOnCallToAction} />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      const buttons = screen.queryAllByTestId("sch-plan-cta-button");
      fireEvent.click(buttons[0]);

      expect(mockOnCallToAction).toHaveBeenCalledTimes(1);
    });

    test("Should render free plan text correctly when `showZeroPriceAsFree` is true", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);
          response.data.active_plans[0].is_free = true;
          response.data.active_plans[0].monthly_price.price = 0;
          response.data.active_plans[0].monthly_price.price_decimal = "0";
          response.data.active_plans[0].yearly_price.price = 0;
          response.data.active_plans[0].yearly_price.price_decimal = "0";
          response.data.show_zero_price_as_free = true;
          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(screen.queryByText("Free")).toBeInTheDocument();
    });

    test("Should render usage-based text for free plans with usage entitlements", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);
          const plan = response.data.active_plans[0];
          plan.is_free = true;
          plan.monthly_price.price = 0;
          plan.monthly_price.price_decimal = "0";
          plan.yearly_price.price = 0;
          plan.yearly_price.price_decimal = "0";

          const entitlement = plan.entitlements[0];
          entitlement.price_behavior = "pay_in_advance";

          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(screen.queryByText("Usage-based")).toBeInTheDocument();
    });

    test("Should render entitlements and handle 'show more'/'show less'", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);
          const plan = response.data.active_plans[0];
          const firstEntitlement = plan.entitlements[0];
          plan.entitlements = Array(10)
            .fill(firstEntitlement)
            .map((entitlement, i) => ({
              ...entitlement,
              id: `ent-${i}`,
              feature: {
                ...entitlement.feature,
                id: `feat-${i}`,
                name: `Feature ${i}`,
              },
            }));

          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      const firstPlan = screen.queryAllByTestId("sch-plan")[0];
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

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      const buttons = screen.queryAllByTestId("sch-plan-cta-button");

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
        expect(button).not.toHaveAttribute(
          "href",
          "https://example.com/signup",
        );
      }
    });

    test("Should show credits when available", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);
          response.data.show_credits = true;

          const plan = response.data.active_plans[2];
          const grant = plan.included_credit_grants[0];
          grant.credit_amount = 1000;
          grant.credit_name = "API Credits";
          grant.singular_name = "API credit";
          grant.plural_name = "API credits";

          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(
        screen.getByText(/1000 API credits per month/),
      ).toBeInTheDocument();
    });

    // TODO: cleanup bottom to top
    test("Should not show credits when showCredits is false", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);
          response.data.show_credits = false;

          const plan = response.data.active_plans[4];
          const grant = plan.included_credit_grants[0];
          grant.credit_amount = 1000;
          grant.credit_name = "API Credits";
          grant.reset_cadence = "monthly";

          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      const loadingText = screen.queryByLabelText("loading");
      await waitFor(() => expect(loadingText).not.toBeInTheDocument());

      expect(
        screen.queryByText(/1000 API Credits per month/),
      ).not.toBeInTheDocument();
    });

    test("Should show the correct period based on plan price availability", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);

          const plan = response.data.active_plans[0];
          // @ts-expect-error: the inferred type from `plansJson` is not nullable
          plan.monthly_price = null;

          return HttpResponse.json(response);
        }),
      );

      const { rerender } = render(<PricingTable callToActionUrl="/" />);

      // Should hide the plan if there is no plan price matching the selected period
      let plans = await screen.findAllByTestId("sch-plan");

      let firstPlanPriceText = within(plans[0]).queryByText("$5.00/month");
      expect(firstPlanPriceText).not.toBeInTheDocument();

      rerender(<PricingTable callToActionUrl="/" showPeriodToggle={false} />);

      // Should show the plan with its yearly price if the period toggle is hidden
      plans = await screen.findAllByTestId("sch-plan");

      firstPlanPriceText = await within(plans[0]).findByTestId(
        "sch-plan-price",
      );
      expect(firstPlanPriceText.textContent).toBe("$50.00/year");
    });

    test("Should not render trial offer text when plan is triable", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);

          response.data.active_plans[0].is_trialable = true;
          response.data.active_plans[0].trial_days = 14;

          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      const plans = await screen.findAllByTestId("sch-plan");

      const firstPlanButtonChooseText = await within(plans[0]).findByText(
        "Choose plan",
      );
      expect(firstPlanButtonChooseText).toBeInTheDocument();

      const firstPlanButtonTrialText = within(plans[0]).queryByText(
        "Start 14 day trial",
      );
      expect(firstPlanButtonTrialText).not.toBeInTheDocument();
    });

    test("Should handle period toggle keyboard navigation", async () => {
      render(<PricingTable callToActionUrl="/" />);

      const plans = await screen.findAllByTestId("sch-plan");

      const firstPlanMonthlyText = await within(plans[0]).findByText("/month");
      expect(firstPlanMonthlyText).toBeInTheDocument();

      const billedYearlyText = await screen.findByText("Billed yearly");
      act(() => {
        fireEvent.focus(billedYearlyText);
        fireEvent.keyDown(billedYearlyText, { key: " " });
      });

      const plansAfterPeriodChange = await screen.findAllByTestId("sch-plan");
      const firstPlanYearlyText = await within(
        plansAfterPeriodChange[0],
      ).findByText("/year");
      expect(firstPlanYearlyText).toBeInTheDocument();
    });

    test("Should handle entitlement expand/collapse with keyboard", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);

          const plan = response.data.active_plans[0];
          plan.entitlements = Array(10)
            .fill(plan.entitlements[0])
            .map((entitlement, i) => ({
              ...entitlement,
              id: `ent-${i}`,
              feature: {
                ...entitlement.feature,
                id: `feat-${i}`,
                name: `Feature ${i}`,
              },
            }));

          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      const plans = await screen.findAllByTestId("sch-plan");
      const featureNameMatcher = /Feature \d/;

      const visibleFeatureNames = await within(plans[0]).findAllByText(
        featureNameMatcher,
      );
      expect(visibleFeatureNames).toHaveLength(4);

      const seeAllText = await within(plans[0]).findByText("See all");
      act(() => {
        fireEvent.focus(seeAllText);
        fireEvent.keyDown(seeAllText, { key: "Enter" });
      });

      const allFeatureNames = await within(plans[0]).findAllByText(
        featureNameMatcher,
      );
      expect(allFeatureNames).toHaveLength(10);
    });
  });

  describe("builder mode", () => {
    test("Invalid plans should show with disabled buttons", async () => {
      server.use(
        http.get(
          "https://api.schematichq.com/components/:id/hydrate",
          async () => {
            const response = cloneDeep(hydrateJson);

            for (const plan of response.data.active_plans) {
              plan.valid = false;
            }

            return HttpResponse.json(response);
          },
        ),
      );

      render(<SchematicEmbed accessToken="token_0" id="0" />);

      const invalidPlanButtons = await screen.findAllByText((_, element) => {
        return (
          element instanceof HTMLElement &&
          element.dataset.testid === "sch-plan-cta-button" &&
          element.textContent === "Over plan limit"
        );
      });
      for (const button of invalidPlanButtons) {
        expect(button).toBeDisabled();
      }

      // custom plan button should be enabled
      const customPlanButtons = await screen.findAllByText("Talk to us");
      for (const button of customPlanButtons) {
        expect(button).toBeEnabled();
      }
    });

    // TODO: fix this test
    // the plan active text is not rendering when on a trial
    // the issue may be in mocking the `useTrialEnd` hook
    // eslint-disable-next-line jest/no-disabled-tests
    test.skip("Should render trial status for current plan", async () => {
      server.use(
        http.get(
          "https://api.schematichq.com/components/:id/hydrate",
          async () => {
            const response = cloneDeep(hydrateJson);

            response.data.active_plans[0].current = true;
            response.data.company.billing_subscription.status = "trialing";
            // @ts-expect-error: the inferred type from `hydrateJson` is not nullable
            response.data.company.billing_subscription.cancel_at = null;

            const endDate = new Date();
            endDate.setDate(endDate.getDate() + 14);
            // @ts-expect-error: the inferred type from `hydrateJson` is not nullable
            response.data.company.billing_subscription.trial_end =
              endDate.toISOString();

            return HttpResponse.json(response);
          },
        ),
      );

      render(<SchematicEmbed accessToken="token_0" id="0" />);

      const trialEndText = await screen.findByText("Trial ends in 14 days");
      expect(trialEndText).toBeInTheDocument();
    });

    test("Should display current plan with 'Active' label", async () => {
      server.use(
        http.get(
          "https://api.schematichq.com/components/:id/hydrate",
          async () => {
            const response = cloneDeep(hydrateJson);

            for (let i = 0; i < response.data.active_plans.length; i++) {
              response.data.active_plans[i].current = i === 0;
            }

            return HttpResponse.json(response);
          },
        ),
      );

      render(<SchematicEmbed accessToken="token_0" id="0" />);

      const plans = await screen.findAllByTestId("sch-plan");

      const activeText = await within(plans[0]).findByText("Active");
      expect(activeText).toBeInTheDocument();

      const currentPlanText = await within(plans[0]).findByText("Current plan");
      expect(currentPlanText).toBeInTheDocument();

      const planButton = within(plans[0]).queryByTestId("sch-plan-cta-button");
      expect(planButton).not.toBeInTheDocument();
    });
  });
});
