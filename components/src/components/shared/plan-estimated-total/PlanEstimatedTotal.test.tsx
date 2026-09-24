import { screen } from "@testing-library/react";

import { PlanPriceCadence } from "../../../api/checkoutexternal";
import { render } from "../../../test/setup";
import type { Plan } from "../../../types";

import { PlanEstimatedTotal } from "./PlanEstimatedTotal";

function makePlan(overrides: Partial<Plan> = {}): Plan {
  return {
    id: "plan-1",
    custom: false,
    estimatedTotals: [
      { amount: 298400, currency: "usd", period: PlanPriceCadence.Monthly },
      { amount: 3580800, currency: "usd", period: PlanPriceCadence.Yearly },
    ],
    ...overrides,
  } as Plan;
}

describe("`PlanEstimatedTotal` component", () => {
  it("shows the estimate for the selected period", () => {
    render(
      <PlanEstimatedTotal
        plan={makePlan()}
        period="month"
        planPrice={119900}
        currency="usd"
      />,
    );

    expect(
      screen.getByText("Est. $2,984.00/month at your current usage"),
    ).toBeInTheDocument();
  });

  it("renders nothing when usage adds nothing to the price", () => {
    render(
      <PlanEstimatedTotal
        plan={makePlan({
          estimatedTotals: [
            {
              amount: 119900,
              currency: "usd",
              period: PlanPriceCadence.Monthly,
            },
          ],
        })}
        period="month"
        planPrice={119900}
        currency="usd"
      />,
    );

    expect(screen.queryByTestId("sch-plan-estimated-total")).toBeNull();
  });

  it("renders nothing without an estimate for the period", () => {
    render(
      <PlanEstimatedTotal
        plan={makePlan()}
        period="quarter"
        planPrice={359700}
        currency="usd"
      />,
    );

    expect(screen.queryByTestId("sch-plan-estimated-total")).toBeNull();
  });

  it("renders nothing without estimates, as in a standalone render", () => {
    render(
      <PlanEstimatedTotal
        plan={makePlan({ estimatedTotals: undefined })}
        period="month"
        planPrice={119900}
        currency="usd"
      />,
    );

    expect(screen.queryByTestId("sch-plan-estimated-total")).toBeNull();
  });

  it("renders nothing for a custom plan", () => {
    render(
      <PlanEstimatedTotal
        plan={makePlan({ custom: true })}
        period="month"
        planPrice={119900}
        currency="usd"
      />,
    );

    expect(screen.queryByTestId("sch-plan-estimated-total")).toBeNull();
  });
});
