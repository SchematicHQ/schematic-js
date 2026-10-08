import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { PlanManager, type PlanManagerProps } from "./PlanManager";
import {
  NOW,
  company,
  companyPlan,
  companySubscription,
  creditBalance,
  creditGrant,
} from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function renderPlan(
  data: BillingData = SCENARIOS.planManager(),
  props: PlanManagerProps = {},
  status?: React.ComponentProps<typeof BillingDataProvider>["status"],
) {
  return render(
    <BillingDataProvider data={data} status={status}>
      <PlanManager locale={L} {...props} />
    </BillingDataProvider>,
  );
}

function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

describe("PlanManager", () => {
  test("waits for the company, its usage and its credits", () => {
    const { company: held } = SCENARIOS.planManager();
    renderPlan({ company: held });
    expect(
      screen.getByText("Loading your plan").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
  });

  test("says the plan is not available on a 404", () => {
    renderPlan(
      {},
      {},
      {
        company: {
          error: new SchematicApiError(404, "/company", "not found"),
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Your plan is not available for this account.",
    );
  });

  test("shows the plan, its price, and its add-ons", () => {
    renderPlan();
    expect(screen.getByRole("heading", { level: 2 })).toHaveTextContent("Pro");
    expect(screen.getByText("For growing teams")).toBeInTheDocument();
    expect(
      screen.getByText("$29.00", {
        selector: ".schematic-plan-manager__price",
      }),
    ).toHaveTextContent("$29.00/mo");
    const addOns = section("Add-ons");
    expect(addOns).toHaveTextContent("Extra seats$10.00/mo");
    expect(addOns).toHaveTextContent("Onboarding$500.00");
    expect(addOns).not.toHaveTextContent("$500.00/");
  });

  test("lists the usage-based features with their prices", () => {
    renderPlan();
    const rows = within(section("Usage-based")).getAllByTestId(
      "schematic-usage-based",
    );
    const text = rows.map((row) => row.textContent);
    expect(text).toContain("12 Seats $180.00/mo");
    expect(text).toContain("GB of storage$0.02/100 GB of storage");
    expect(text).toContain("1,000 EmailsAdditional: $0.05/Email");
  });

  test("shows the plan's credits per license, with the tally and the auto top-up", () => {
    renderPlan(SCENARIOS.planManager(), { editAutoTopupUrl: "/topup" });
    const credits = section("Credits in plan");
    const [row] = within(credits).getAllByTestId("schematic-plan-credit");
    expect(row).toHaveTextContent(
      "10 AI credits per Seat + 100 AI credits per month",
    );
    expect(row).toHaveTextContent("150 used");
    expect(row).toHaveTextContent("12 Seats × 10 + 100 = 220 AI credits/mo");
    expect(credits).toHaveTextContent(
      "Adds 500 AI credits when 50 remaining in balance",
    );
    expect(within(credits).getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/topup",
    );
  });

  test("offers Edit only when the host gives it somewhere to go", () => {
    renderPlan();
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Edit" })).toBeNull();
  });

  test("groups bundles, top-ups and promotional credits", () => {
    renderPlan();
    expect(section("Credit bundles")).toHaveTextContent(
      "(2) 500 credit pack (500 AI credits)40 used",
    );
    expect(section("Top-ups")).toHaveTextContent("(2) 500 AI credits500 used");
    expect(section("Promotional credits")).toHaveTextContent(
      "25 Export credits5 used",
    );
  });

  test("hides every credit section with showCredits off", () => {
    renderPlan(SCENARIOS.planManager(), { showCredits: false });
    for (const name of [
      "Credits in plan",
      "Credit bundles",
      "Top-ups",
      "Promotional credits",
    ]) {
      expect(screen.queryByRole("region", { name })).toBeNull();
    }
  });

  test("shows three rows of a section before See all", () => {
    const grants = [1, 2, 3, 4].map((day) =>
      creditGrant({
        bundleId: `bcb_${day}`,
        bundleName: `Pack ${day}`,
        grantReason: "purchased",
      }),
    );
    renderPlan({
      ...SCENARIOS.planManager(),
      creditBalances: [creditBalance({ grants })],
    });
    const bundles = section("Credit bundles");
    expect(
      within(bundles).getAllByTestId("schematic-credit-group"),
    ).toHaveLength(3);
    fireEvent.click(
      within(bundles).getByRole("button", { name: "See all (4)" }),
    );
    expect(
      within(bundles).getAllByTestId("schematic-credit-group"),
    ).toHaveLength(4);
    expect(
      within(bundles).getByRole("button", { name: "Hide all" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("leaves section labels out on request", () => {
    renderPlan(SCENARIOS.planManager(), { showLabels: false });
    expect(screen.queryByText("Add-ons")).toBeNull();
    expect(section("Add-ons")).toBeInTheDocument();
  });

  test("offers Change plan only when the host gives it somewhere to go", () => {
    const onChangePlan = vi.fn();
    const { unmount } = renderPlan();
    expect(screen.queryByText("Change plan")).toBeNull();
    unmount();

    renderPlan(SCENARIOS.planManager(), { onChangePlan });
    fireEvent.click(screen.getByRole("button", { name: "Change plan" }));
    expect(onChangePlan).toHaveBeenCalledOnce();
  });

  test("counts a trial down", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(NOW);
    try {
      renderPlan(SCENARIOS.planManagerTrialing());
    } finally {
      vi.useRealTimers();
    }
    expect(screen.getByRole("status")).toHaveTextContent(
      "Trial ends in 14 days",
    );
  });

  test("says the trial has ended once its end has passed", () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(NOW.getTime() + 60 * 86_400_000));
    try {
      renderPlan(SCENARIOS.planManagerTrialing());
    } finally {
      vi.useRealTimers();
    }
    expect(screen.getByRole("status")).toHaveTextContent(
      "Your trial has ended",
    );
  });

  test("says when a cancelled plan ends", () => {
    renderPlan({
      ...SCENARIOS.planManager(),
      company: company({
        subscription: companySubscription({
          cancelAt: new Date("2026-10-01T12:00:00Z"),
          cancelAtPeriodEnd: true,
        }),
      }),
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Subscription canceledAccess to Pro will end on October 1, 2026.",
    );
  });

  test("asks for payment on a custom plan, with no plan change until it activates", () => {
    renderPlan(
      {
        ...SCENARIOS.planManager(),
        company: company({
          customPlanBilling: {
            activationStrategy: "on_payment",
            dueAt: new Date("2026-09-01T12:00:00Z"),
            invoiceUrl: "https://pay.example/inv",
            planId: "plan_custom",
          },
          plan: companyPlan({ name: "Starter" }),
        }),
      },
      { changePlanUrl: "/plans" },
    );
    const notice = screen.getByRole("status");
    expect(notice).toHaveTextContent(
      "Pay to activate your planPay the invoice to activate your custom plan. Due by September 1, 2026.",
    );
    expect(
      within(notice).getByRole("link", { name: "Pay now" }),
    ).toHaveAttribute("href", "https://pay.example/inv");
    expect(screen.queryByRole("link", { name: "Change plan" })).toBeNull();
  });

  test("says when a scheduled downgrade lands", () => {
    renderPlan({
      ...SCENARIOS.planManager(),
      company: company({
        scheduledDowngrade: {
          fromPlanId: "plan_pro",
          fromPlanName: "Pro",
          toPlanId: "plan_free",
          toPlanName: "Free",
        },
        subscription: companySubscription({
          periodEnd: new Date("2026-09-15T12:00:00Z"),
        }),
      }),
    });
    expect(screen.getByRole("status")).toHaveTextContent(
      "Downgrade to Free scheduledAccess to Pro will end on September 15, 2026.",
    );
  });

  test("shows no plan header for a company without a plan", () => {
    renderPlan({
      ...SCENARIOS.planManager(),
      company: company({ plan: undefined }),
    });
    expect(screen.queryByRole("heading", { level: 2 })).toBeNull();
  });
});
