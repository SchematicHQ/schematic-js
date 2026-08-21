import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import type { CatalogData } from "../contract";
import { CatalogDataProvider } from "../data";
import { NOW, daysFromNow } from "../fixtures/builders";
import { seatAddOn } from "../fixtures/company";
import { SCENARIOS } from "../fixtures/scenarios";
import { formatDate } from "../model";

import { PlanManager, type PlanManagerProps } from "./PlanManager";

function renderManager(
  data: CatalogData = SCENARIOS.pro(),
  props: PlanManagerProps = {},
  status?: React.ComponentProps<typeof CatalogDataProvider>["status"],
) {
  return render(
    <CatalogDataProvider data={data} status={status}>
      <PlanManager locale="en-US" now={NOW} {...props} />
    </CatalogDataProvider>,
  );
}

const notice = () => screen.getByTestId("sch-plan-notice");

describe("PlanManager status", () => {
  test("renders a skeleton while the company loads", () => {
    renderManager({});
    expect(screen.getByLabelText("Loading plan")).toBeInTheDocument();
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <CatalogDataProvider
        data={{}}
        status={{ company: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <PlanManager />
      </CatalogDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRefetch).toHaveBeenCalledWith("company");
  });

  test("renders without the catalog, minus the catalog-derived sections", () => {
    const { company } = SCENARIOS.pro();
    renderManager({ company });
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(screen.getByTestId("sch-add-ons")).toBeInTheDocument();
    expect(screen.queryByTestId("sch-usage-based")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sch-credits")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sch-change-plan")).not.toBeInTheDocument();
  });
});

describe("PlanManager header", () => {
  test("plan name, description, and the priced header", () => {
    renderManager();
    const header = within(screen.getByTestId("sch-plan-header"));
    expect(header.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
    expect(header.getByText("For growing teams.")).toBeInTheDocument();
    expect(header.getByTestId("sch-plan-price")).toHaveTextContent("$49.00/mo");
    expect(screen.getByTestId("sch-renewal")).toHaveTextContent(
      `Renews on ${formatDate(daysFromNow(20), "en-US")}`,
    );
  });

  test("the empty state keeps the call to action", () => {
    renderManager(SCENARIOS.noPlan());
    expect(
      screen.getByRole("heading", { name: "No plan" }),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("sch-plan-price")).not.toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Change plan" }),
    ).toBeInTheDocument();
  });

  test("a free plan is $0.00, or Free with showZeroPriceAsFree", () => {
    renderManager(SCENARIOS.free());
    expect(screen.getByTestId("sch-plan-price")).toHaveTextContent(/^\$0\.00$/);
    renderManager(SCENARIOS.free(), { showZeroPriceAsFree: true });
    expect(screen.getAllByTestId("sch-plan-price")[1]).toHaveTextContent(
      /^Free$/,
    );
  });

  test("a custom plan reads Custom", () => {
    renderManager(SCENARIOS.customBilled());
    expect(screen.getByTestId("sch-plan-price")).toHaveTextContent(/^Custom$/);
  });

  test("header, description, and price toggles", () => {
    renderManager(SCENARIOS.pro(), {
      showDescription: false,
      showPrice: false,
    });
    expect(screen.queryByText("For growing teams.")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sch-plan-price")).not.toBeInTheDocument();
    renderManager(SCENARIOS.pro(), { showHeader: false });
    expect(screen.getAllByTestId("sch-plan-header")).toHaveLength(1);
  });
});

describe("PlanManager notices", () => {
  test("trial: countdown and the landing plan", () => {
    renderManager(SCENARIOS.trialing());
    expect(notice()).toHaveClass("schematic-notice");
    expect(notice()).not.toHaveClass("schematic-notice--warning");
    expect(
      within(notice()).getByRole("heading", { name: "Trial ends in 5 days" }),
    ).toBeInTheDocument();
    expect(notice()).toHaveTextContent(
      "After the trial, you will move to the Free plan. You will not be charged unless you subscribe to a paid plan during the trial.",
    );
    expect(screen.queryByTestId("sch-renewal")).not.toBeInTheDocument();
  });

  test("cancel", () => {
    renderManager(SCENARIOS.canceling());
    expect(notice()).toHaveClass("schematic-notice--danger");
    expect(
      within(notice()).getByRole("heading", { name: "Subscription canceled" }),
    ).toBeInTheDocument();
    expect(notice()).toHaveTextContent(
      `Access to Pro will end on ${formatDate(daysFromNow(20), "en-US")}.`,
    );
    expect(screen.queryByTestId("sch-renewal")).not.toBeInTheDocument();
  });

  test("scheduled downgrade", () => {
    renderManager(SCENARIOS.downgrading());
    expect(notice()).toHaveClass("schematic-notice--warning");
    expect(
      within(notice()).getByRole("heading", {
        name: "Downgrade to Free scheduled",
      }),
    ).toBeInTheDocument();
    expect(notice()).toHaveTextContent(
      `Access to Pro will end on ${formatDate(daysFromNow(20), "en-US")}.`,
    );
  });

  test("custom billing: Pay now link, and no Change plan until paid", () => {
    renderManager(SCENARIOS.customBilled());
    expect(notice()).toHaveClass("schematic-notice--warning");
    expect(
      within(notice()).getByRole("heading", {
        name: "Pay to activate Enterprise",
      }),
    ).toBeInTheDocument();
    expect(notice()).toHaveTextContent(
      `Pay the invoice to activate your custom plan. Due by ${formatDate(daysFromNow(29), "en-US")}.`,
    );
    const payNow = within(notice()).getByRole("link", { name: "Pay now" });
    expect(payNow).toHaveAttribute("href", "https://invoice.example/pay");
    expect(payNow).toHaveAttribute("target", "_blank");
    expect(screen.queryByTestId("sch-change-plan")).not.toBeInTheDocument();
  });

  test("showNotice off hides the notice and lets the renewal line through", () => {
    renderManager(SCENARIOS.trialing(), { showNotice: false });
    expect(screen.queryByTestId("sch-plan-notice")).not.toBeInTheDocument();
    expect(screen.getByTestId("sch-renewal")).toBeInTheDocument();
  });
});

describe("PlanManager sections", () => {
  test("add-on rows: recurring, one-time, and quantity", () => {
    const data = SCENARIOS.pro();
    const onboarding = SCENARIOS.public().catalog!.addOns[1];
    data.company = {
      ...data.company!,
      addOns: [
        ...data.company!.addOns,
        seatAddOn(),
        {
          ...seatAddOn(),
          id: "addon_onboarding",
          name: onboarding.name,
          price: onboarding.prices[0],
          quantity: null,
        },
      ],
    };
    renderManager(data);
    const rows = within(screen.getByTestId("sch-add-ons")).getAllByTestId(
      "sch-add-on",
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("Advanced analytics");
    expect(rows[0]).toHaveTextContent("$19.00/mo");
    expect(rows[1]).toHaveTextContent("Extra seats × 3");
    expect(rows[1]).toHaveTextContent("$5.00/mo");
    expect(rows[2]).toHaveTextContent("Onboarding session");
    expect(rows[2]).toHaveTextContent("$500.00 one-time");
  });

  test("usage-based rows with the overage detail", () => {
    renderManager();
    const rows = within(screen.getByTestId("sch-usage-based")).getAllByTestId(
      "sch-usage-based-row",
    );
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent("API call");
    expect(rows[0]).toHaveTextContent("10,000 API calls per month");
    expect(rows[0]).toHaveTextContent("then $0.02/API call");
    expect(rows[1]).toHaveTextContent("$15.00 per seat per month");
    expect(rows[2]).toHaveTextContent("2 AI credits per image generation");
  });

  test("credits with the auto top-up card and its Edit callback", () => {
    const onEditAutoTopup = vi.fn();
    renderManager(SCENARIOS.pro(), { onEditAutoTopup });
    const credits = within(screen.getByTestId("sch-credits"));
    expect(credits.getByTestId("sch-credit")).toHaveTextContent(
      "500 AI credits per month",
    );
    const topup = within(credits.getByTestId("sch-auto-topup"));
    expect(
      topup.getByText("Adds 500 AI credits when 50 remaining in balance"),
    ).toBeInTheDocument();
    fireEvent.click(topup.getByRole("button", { name: "Edit" }));
    expect(onEditAutoTopup).toHaveBeenCalledWith(
      expect.objectContaining({
        credit: expect.objectContaining({ id: "credit_ai" }),
        enabled: true,
      }),
    );
  });

  test("a disabled auto top-up, rendered as a link", () => {
    const data = SCENARIOS.pro();
    data.company = {
      ...data.company!,
      creditAutoTopups: [
        { ...data.company!.creditAutoTopups[0], enabled: false },
      ],
    };
    renderManager(data, { editAutoTopupUrl: "/billing/credits" });
    const topup = within(screen.getByTestId("sch-auto-topup"));
    expect(
      topup.getByText("Auto top-up disabled for AI credits"),
    ).toBeInTheDocument();
    expect(topup.getByRole("link", { name: "Edit" })).toHaveAttribute(
      "href",
      "/billing/credits",
    );
  });

  test("no Edit without self-service", () => {
    const data = SCENARIOS.pro();
    data.company = {
      ...data.company!,
      creditAutoTopups: [
        { ...data.company!.creditAutoTopups[0], selfService: false },
      ],
    };
    renderManager(data);
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  test("section toggles", () => {
    renderManager(SCENARIOS.pro(), {
      showAddOns: false,
      showAutoTopup: false,
      showUsageBased: false,
    });
    expect(screen.queryByTestId("sch-add-ons")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sch-usage-based")).not.toBeInTheDocument();
    expect(screen.getByTestId("sch-credits")).toBeInTheDocument();
    expect(screen.queryByTestId("sch-auto-topup")).not.toBeInTheDocument();
    renderManager(SCENARIOS.pro(), { showCredits: false });
    expect(screen.getAllByTestId("sch-credits")).toHaveLength(1);
  });
});

describe("PlanManager call to action", () => {
  test("hands the summary to onChangePlan", () => {
    const onChangePlan = vi.fn();
    renderManager(SCENARIOS.pro(), { onChangePlan });
    fireEvent.click(screen.getByRole("button", { name: "Change plan" }));
    expect(onChangePlan).toHaveBeenCalledWith(
      expect.objectContaining({
        canChangePlan: true,
        plan: expect.objectContaining({ id: "plan_pro" }),
      }),
    );
  });

  test("renders as a link with a custom label", () => {
    renderManager(SCENARIOS.pro(), {
      callToActionText: "Manage plan",
      changePlanTarget: "_self",
      changePlanUrl: "/billing",
    });
    const link = screen.getByRole("link", { name: "Manage plan" });
    expect(link).toHaveAttribute("href", "/billing");
    expect(link).toHaveAttribute("target", "_self");
  });

  test("hidden by showCallToAction or the checkout capability", () => {
    renderManager(SCENARIOS.pro(), { showCallToAction: false });
    expect(screen.queryByTestId("sch-change-plan")).not.toBeInTheDocument();
    const data = SCENARIOS.pro();
    data.catalog = { ...data.catalog!, capabilities: { checkout: false } };
    renderManager(data);
    expect(screen.queryByTestId("sch-change-plan")).not.toBeInTheDocument();
  });
});
