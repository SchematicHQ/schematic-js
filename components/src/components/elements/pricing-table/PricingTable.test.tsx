import { jest } from "@jest/globals";
import "@testing-library/dom";
import "@testing-library/jest-dom";
import cloneDeep from "lodash/cloneDeep";
import { HttpResponse, delay, http } from "msw";

import hydrateJson from "~/test/mocks/handlers/response/hydrate.json";
import plansJson from "~/test/mocks/handlers/response/plans.json";
import { server } from "~/test/mocks/node";
import {
  act,
  fireEvent,
  render,
  screen,
  waitForElementToBeRemoved,
  within,
} from "~/test/setup";

import { SchematicEmbed } from "../../embed";

import { PricingTable } from ".";

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

      const loading = screen.queryByLabelText("loading");
      expect(loading).toBeInTheDocument();
    });

    test("Renders empty when no plans are available", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          return HttpResponse.json({ data: { active_plans: [] } });
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      const wrapper = await screen.findByTestId("sch-pricing-table");
      expect(wrapper).toBeInTheDocument();

      const plansWrapper = screen.queryByTestId("sch-plans");
      expect(plansWrapper).not.toBeInTheDocument();
    });

    test("Renders pricing table with plans", async () => {
      render(<PricingTable callToActionUrl="/" />);

      const wrapper = await screen.findByTestId("sch-pricing-table");
      expect(wrapper).toBeInTheDocument();

      const plans = within(wrapper).queryAllByTestId("sch-plan");
      expect(plans).toHaveLength(4);

      const buttons = within(wrapper).queryAllByTestId("sch-plan-cta-button");
      expect(buttons).toHaveLength(4);
      for (const button of buttons) {
        expect(button).toBeEnabled();
      }
    });

    test("Should hide plans when `plans.isVisible` is false", async () => {
      render(<PricingTable callToActionUrl="/" plans={{ isVisible: false }} />);

      const wrapper = await screen.findByTestId("sch-pricing-table");
      expect(wrapper).toBeInTheDocument();

      const plans = within(wrapper).queryByTestId("sch-plans");
      expect(plans).not.toBeInTheDocument();
    });

    test("Should hide header when `header.isVisible` is false", async () => {
      render(
        <PricingTable callToActionUrl="/" header={{ isVisible: false }} />,
      );

      const wrapper = await screen.findByTestId("sch-pricing-table");
      expect(wrapper).toBeInTheDocument();

      const plansText = within(wrapper).queryByText("Plans");
      expect(plansText).not.toBeInTheDocument();
    });

    test("Should hide period toggle when `showPeriodToggle` is false", async () => {
      render(<PricingTable callToActionUrl="/" showPeriodToggle={false} />);

      const wrapper = await screen.findByTestId("sch-pricing-table");
      expect(wrapper).toBeInTheDocument();

      const periodToggle = within(wrapper).queryByTestId("sch-period-toggle");
      expect(periodToggle).not.toBeInTheDocument();
    });

    test("Should hide add-ons when `addOns.isVisible` is false", async () => {
      render(
        <PricingTable callToActionUrl="/" addOns={{ isVisible: false }} />,
      );

      const wrapper = await screen.findByTestId("sch-pricing-table");
      expect(wrapper).toBeInTheDocument();

      const plansText = within(wrapper).queryByText("Plans");
      expect(plansText).toBeInTheDocument();

      const addOnsText = within(wrapper).queryByText("Add-ons");
      expect(addOnsText).not.toBeInTheDocument();
    });

    test("Should toggle between monthly and yearly plan prices", async () => {
      render(<PricingTable callToActionUrl="/" />);

      const periodToggle = await screen.findByTestId("sch-period-toggle");
      expect(periodToggle).toBeInTheDocument();

      const plans = await screen.findAllByTestId("sch-plan");
      const price = await within(plans[0]).findByTestId("sch-plan-price");

      let periodText = within(price).getByText("/month");
      expect(periodText).toBeInTheDocument();

      const yearButton = await within(periodToggle).findByText("Billed yearly");
      act(() => {
        fireEvent.click(yearButton);
      });

      periodText = within(price).getByText("/year");
      expect(periodText).toBeInTheDocument();
    });

    test("Should call `onCallToAction` when clicking a plan button", async () => {
      const mockOnCallToAction = jest.fn();

      render(<PricingTable onCallToAction={mockOnCallToAction} />);

      const buttons = await screen.findAllByTestId("sch-plan-cta-button");

      act(() => {
        fireEvent.click(buttons[0]);
      });

      expect(mockOnCallToAction).toHaveBeenCalledTimes(1);
    });

    test("Should render free plan price as 'Free' when `showZeroPriceAsFree` is true", async () => {
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

      const plans = await screen.findAllByTestId("sch-plan");
      const price = await within(plans[0]).findByTestId("sch-plan-price");
      const freeText = await within(price).findByText("Free");
      expect(freeText).toBeInTheDocument();
    });

    test("Should render 'Usage-based' text for free plans with usage-based entitlements", async () => {
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

      const plans = await screen.findAllByTestId("sch-plan");
      const price = await within(plans[0]).findByTestId("sch-plan-price");
      const usageBasedText = await within(price).findByText("Usage-based");
      expect(usageBasedText).toBeInTheDocument();
    });

    test("Should render entitlements and handle 'show more'/'show less'", async () => {
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

      let visibleFeatureNames = await within(plans[0]).findAllByText(
        featureNameMatcher,
      );
      expect(visibleFeatureNames).toHaveLength(4);

      const seeAllText = await within(plans[0]).findByText("See all");

      act(() => {
        fireEvent.click(seeAllText);
      });

      visibleFeatureNames = await within(plans[0]).findAllByText(
        featureNameMatcher,
      );
      expect(visibleFeatureNames).toHaveLength(10);

      const hideAllText = await within(plans[0]).findByText("Hide all");
      expect(hideAllText).toBeInTheDocument();

      act(() => {
        fireEvent.click(hideAllText);
      });

      visibleFeatureNames = await within(plans[0]).findAllByText(
        featureNameMatcher,
      );
      expect(visibleFeatureNames).toHaveLength(4);
    });

    test("Should render plan buttons as `callToAction` links", async () => {
      render(
        <PricingTable
          callToActionUrl="https://example.com/signup"
          callToActionTarget="_self"
        />,
      );

      const buttons = await screen.findAllByTestId("sch-plan-cta-button");

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
          grant.reset_cadence = "monthly";

          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      await screen.findByText("Professional");

      const creditGrantText = screen.queryByText("1000 API credits per month");
      expect(creditGrantText).toBeInTheDocument();
    });

    test("Should not show credits when `showCredits` is false", async () => {
      server.use(
        http.get("https://api.schematichq.com/public/plans", async () => {
          const response = cloneDeep(plansJson);

          response.data.show_credits = false;

          const plan = response.data.active_plans[2];
          const grant = plan.included_credit_grants[0];
          grant.credit_amount = 1000;
          grant.credit_name = "API Credits";
          grant.singular_name = "API credit";
          grant.plural_name = "API credits";
          grant.reset_cadence = "monthly";

          return HttpResponse.json(response);
        }),
      );

      render(<PricingTable callToActionUrl="/" />);

      await screen.findByText("Professional");

      const creditGrantText = screen.queryByText("1000 API credits per month");
      expect(creditGrantText).not.toBeInTheDocument();
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
      expect(firstPlanPriceText).toHaveTextContent("$50.00/year");
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

    test("Should render trial status for current plan", async () => {
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
              endDate.getTime() / 1000;

            return HttpResponse.json(response);
          },
        ),
      );

      render(<SchematicEmbed accessToken="token_0" id="0" />);

      const trialEndText = await screen.findByText(/Trial ends in 1[45] days/);
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

      const plans = await screen.findAllByTestId("sch-plan");
      expect(plans).toHaveLength(4);

      const seeAllText = screen.queryByText("See all");
      expect(seeAllText).not.toBeInTheDocument();
    });
  });
});
