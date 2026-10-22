import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { PricingTable, type PricingTableProps } from "./PricingTable";
import {
  catalogCreditGrant,
  catalogEntitlement,
  publicCatalog,
  publicCatalogPlan,
} from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function renderTable(
  data: BillingData = SCENARIOS.pricingTable(),
  props: PricingTableProps = {},
  status?: React.ComponentProps<typeof BillingDataProvider>["status"],
) {
  return render(
    <BillingDataProvider data={data} status={status}>
      <PricingTable locale={L} {...props} />
    </BillingDataProvider>,
  );
}

function card(name: string): HTMLElement {
  const heading = screen.getByRole("heading", { name });
  const item = heading.closest("li");
  if (item === null) {
    throw new Error(`no card for ${name}`);
  }
  return item;
}

describe("PricingTable", () => {
  test("waits for the catalog", () => {
    renderTable({}, {}, { catalog: { isPending: true } });
    expect(
      screen.getByText("Loading plans").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
  });

  test("waits for the company before standing it against the catalog", () => {
    const { catalog } = SCENARIOS.pricingTable();
    renderTable({ catalog });
    expect(
      screen.getByText("Loading plans").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
  });

  test("shows the table when the company fails to load", () => {
    const { catalog } = SCENARIOS.pricingTable();
    renderTable(
      { catalog },
      {},
      { company: { error: new Error("Boom"), isPending: false } },
    );
    expect(screen.getByRole("heading", { name: "Pro" })).toBeInTheDocument();
  });

  test("says plans are not available on a 404", () => {
    renderTable(
      {},
      {},
      {
        catalog: {
          error: new SchematicApiError(404, "/catalog/view", "not found"),
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Plans are not available for this account.",
    );
  });

  test("lists the public catalog's plans and add-ons, with no action of its own", () => {
    renderTable(SCENARIOS.pricingTablePublic());
    expect(
      screen.getByRole("heading", { name: "Plans", level: 2 }),
    ).toBeTruthy();
    expect(
      screen.getByRole("heading", { name: "Add-ons", level: 2 }),
    ).toBeTruthy();
    expect(
      within(screen.getByRole("list", { name: "Plans" }))
        .getAllByRole("heading", { level: 3 })
        .map((heading) => heading.textContent),
    ).toEqual(["Free", "Pro", "Scale"]);
    expect(within(card("Pro")).getByText("$29.00")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Choose plan" })).toBeNull();
    expect(screen.queryByText("Current plan")).toBeNull();
  });

  test("hands the chosen plan to onSelectPlan", () => {
    const onSelectPlan = vi.fn();
    renderTable(SCENARIOS.pricingTablePublic(), { onSelectPlan });
    fireEvent.click(
      within(card("Scale")).getByRole("button", { name: "Choose plan" }),
    );
    const scale = SCENARIOS.pricingTablePublic().publicCatalog!.plans[2];
    expect(onSelectPlan).toHaveBeenCalledWith({
      kind: "plan",
      id: expect.any(String),
      priceId: expect.any(String),
      period: "month",
      currency: "usd",
      trialDays: scale.trialDays,
    });
    fireEvent.click(
      within(card("Onboarding")).getByRole("button", {
        name: "Choose add-on",
      }),
    );
    expect(onSelectPlan).toHaveBeenLastCalledWith(
      expect.objectContaining({ kind: "addOn", period: null }),
    );
  });

  test("links each card to callToActionUrl without onSelectPlan", () => {
    renderTable(SCENARIOS.pricingTablePublic(), {
      callToActionUrl: "https://example.com/signup",
      callToActionTarget: "_self",
    });
    const link = within(card("Pro")).getByRole("link", { name: "Choose plan" });
    expect(link).toHaveAttribute("href", "https://example.com/signup");
    expect(link).toHaveAttribute("target", "_self");
  });

  test("switches period with the toggle, and tells the host", () => {
    const onPeriodChange = vi.fn();
    renderTable(SCENARIOS.pricingTablePublic(), { onPeriodChange });
    const toggle = screen.getByRole("group", { name: "Billing period" });
    expect(
      within(toggle).getByRole("button", { name: "Billed monthly" }),
    ).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(
      within(toggle).getByRole("button", { name: "Billed yearly" }),
    );
    expect(onPeriodChange).toHaveBeenCalledWith("year");
    expect(within(card("Pro")).getByText("$290.00")).toBeInTheDocument();
    expect(within(card("Pro")).getByText("/year")).toBeInTheDocument();
  });

  test("leaves a controlled period to the host", () => {
    const onPeriodChange = vi.fn();
    renderTable(SCENARIOS.pricingTablePublic(), {
      period: "month",
      onPeriodChange,
    });
    fireEvent.click(screen.getByRole("button", { name: "Billed yearly" }));
    expect(onPeriodChange).toHaveBeenCalledWith("year");
    expect(within(card("Pro")).getByText("$29.00")).toBeInTheDocument();
  });

  test("hides the toggle and the picker where there is nothing to pick", () => {
    renderTable(SCENARIOS.pricingTablePublic(), { showPeriodToggle: false });
    expect(screen.queryByRole("group", { name: "Billing period" })).toBeNull();
    expect(screen.queryByRole("combobox", { name: "Currency" })).toBeNull();
  });

  test("marks the company's plan, and holds back what it cannot choose", () => {
    renderTable(SCENARIOS.pricingTable(), { onSelectPlan: vi.fn() });
    const pro = card("Pro");
    expect(pro).toHaveClass("schematic-plan-card--active");
    expect(within(pro).getByText("Active")).toBeInTheDocument();
    expect(within(pro).getByText("Current plan")).toBeInTheDocument();
    expect(
      within(pro).queryByRole("button", { name: "Choose plan" }),
    ).toBeNull();

    const scale = card("Scale");
    expect(
      within(scale).getByRole("button", { name: "Over plan limit" }),
    ).toBeDisabled();
    expect(
      within(scale).getByText("API call usage is over the limit."),
    ).toBeInTheDocument();

    expect(
      within(card("Free")).getByRole("button", { name: "Choose plan" }),
    ).toHaveClass("schematic-cta--outline");
    expect(
      within(card("Priority support")).getByRole("button", {
        name: "Choose add-on",
      }),
    ).not.toHaveClass("schematic-cta--outline");
  });

  test("offers the catalog's custom plan as a link", () => {
    renderTable();
    const custom = card("Custom");
    expect(within(custom).getByText("Let's talk")).toBeInTheDocument();
    expect(
      within(custom).getByRole("link", { name: "Talk to sales" }),
    ).toHaveAttribute("href", "https://example.com/sales");
  });

  test("words the plan's credits and features, leaving hidden credits off", () => {
    renderTable();
    const pro = card("Pro");
    expect(
      within(pro).getByText("100 AI credits per month"),
    ).toBeInTheDocument();
    expect(within(pro).queryByText(/Placeholder/)).toBeNull();
    expect(
      within(pro).getByText("10,000 API calls per month"),
    ).toBeInTheDocument();
    expect(
      within(pro).getByText("$10.00 per Seat per month"),
    ).toBeInTheDocument();
    expect(within(pro).getByText("then $0.50/GB of storage/mo")).toBeTruthy();
    expect(within(pro).getByText("Everything in Free, plus")).toBeTruthy();
  });

  test("words a credit granted per license with the period it renews in", () => {
    const plan = publicCatalogPlan({
      name: "Team",
      entitlements: [
        catalogEntitlement({ featureName: "Seat", licenseId: "lic_1" }),
      ],
      includedCreditGrants: [
        catalogCreditGrant({
          creditId: "bilcr_ai",
          creditAmount: 40,
          scaling: "per_license",
          licenseId: "lic_1",
        }),
        catalogCreditGrant({ creditId: "bilcr_ai", creditAmount: 100 }),
      ],
    });
    renderTable({ publicCatalog: publicCatalog({ plans: [plan] }) });
    expect(
      within(card("Team")).getByText("40 AI credits per Seat per month"),
    ).toBeInTheDocument();
    expect(
      within(card("Team")).getByText(
        "Plus 100 AI credits per month for your company",
      ),
    ).toBeInTheDocument();
    expect(
      within(card("Team")).queryByText("100 AI credits per month"),
    ).toBeNull();
  });

  test("tells the company what yearly billing saves on its plan", () => {
    renderTable();
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "Save up to 16.67% with yearly billing",
    );
    fireEvent.click(screen.getByRole("button", { name: "Billed yearly" }));
    expect(screen.getByRole("tooltip", { hidden: true })).toHaveTextContent(
      "You are saving 16.67% with yearly billing",
    );
  });

  test("offers no savings tip in the public catalog", () => {
    renderTable(SCENARIOS.pricingTablePublic());
    expect(screen.queryByRole("tooltip", { hidden: true })).toBeNull();
  });

  test("shows four features until asked for all", () => {
    renderTable();
    const pro = card("Pro");
    expect(within(pro).queryByText("Unlimited Projects")).toBeNull();
    fireEvent.click(within(pro).getByRole("button", { name: "See all" }));
    expect(within(pro).getByText("Unlimited Projects")).toBeInTheDocument();
    expect(
      within(pro).getByRole("button", { name: "Hide all" }),
    ).toHaveAttribute("aria-expanded", "true");
  });

  test("turns sections and details off", () => {
    renderTable(SCENARIOS.pricingTable(), {
      showAddOns: false,
      showCredits: false,
      showDescription: false,
      showEntitlements: false,
      showHeader: false,
    });
    expect(screen.queryByRole("heading", { name: "Plans" })).toBeNull();
    expect(screen.queryByRole("list", { name: "Add-ons" })).toBeNull();
    expect(screen.queryByText("For larger teams")).toBeNull();
    expect(screen.queryByText(/AI credits/)).toBeNull();
    expect(screen.queryByText(/API calls/)).toBeNull();
  });

  test("puts the cards a heading below the section's", () => {
    renderTable(SCENARIOS.pricingTable(), { headingLevel: 3 });
    expect(
      screen.getByRole("heading", { name: "Plans", level: 3 }),
    ).toBeTruthy();
    expect(screen.getByRole("heading", { name: "Pro", level: 4 })).toBeTruthy();
  });

  test("names its own copy through strings", () => {
    renderTable(SCENARIOS.pricingTablePublic(), {
      onSelectPlan: vi.fn(),
      strings: { pricingTableChoosePlan: "Pick" },
    });
    expect(screen.getAllByRole("button", { name: "Pick" })).toHaveLength(3);
  });
});
