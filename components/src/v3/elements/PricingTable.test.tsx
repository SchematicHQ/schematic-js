import { CatalogDataProvider } from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { proCompanyCatalog, publicCatalog } from "../fixtures/scenarios";

import { PricingTable, type PricingTableProps } from "./PricingTable";

function renderTable(
  catalog = publicCatalog(),
  props: PricingTableProps = {},
  status?: React.ComponentProps<typeof CatalogDataProvider>["status"],
) {
  return render(
    <CatalogDataProvider data={{ catalog }} status={status}>
      <PricingTable {...props} />
    </CatalogDataProvider>,
  );
}

describe("PricingTable", () => {
  test("renders a skeleton while the catalog loads", () => {
    render(
      <CatalogDataProvider data={{}}>
        <PricingTable />
      </CatalogDataProvider>,
    );
    expect(screen.getByLabelText("Loading plans")).toBeInTheDocument();
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <CatalogDataProvider
        data={{}}
        status={{ catalog: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <PricingTable />
      </CatalogDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRefetch).toHaveBeenCalledWith("catalog");
  });

  test("renders outside a provider as an error rather than crashing", () => {
    render(<PricingTable />);
    expect(screen.getByRole("alert")).toHaveTextContent(/CatalogDataProvider/);
  });

  test("renders every plan with its price, entitlements, and CTA", () => {
    renderTable();
    const plans = screen.getAllByTestId("sch-plan");
    expect(plans).toHaveLength(3);
    const pro = within(plans[1]);
    expect(pro.getByTestId("sch-plan-price")).toHaveTextContent("$49.00/month");
    expect(pro.getByText("Everything in Free, plus")).toBeInTheDocument();
    expect(pro.getByText("10,000 API calls per month")).toBeInTheDocument();
    expect(pro.getByText("then $0.02/API call")).toBeInTheDocument();
    expect(pro.getByText("$15.00 per seat per month")).toBeInTheDocument();
    expect(
      pro.getByText("2 AI credits per image generation"),
    ).toBeInTheDocument();
    expect(pro.getByText("500 AI credits per month")).toBeInTheDocument();
    expect(
      pro.getByRole("button", { name: "Start 14-day trial" }),
    ).toBeEnabled();
    expect(screen.getByTestId("sch-custom-plan")).toHaveTextContent(
      "Talk to sales",
    );
  });

  test("collapses long entitlement lists", () => {
    renderTable();
    const pro = within(screen.getAllByTestId("sch-plan")[1]);
    // 1 credit line + 4 of 5 entitlements visible
    expect(pro.getAllByRole("listitem")).toHaveLength(5);
    fireEvent.click(pro.getByRole("button", { name: "See all" }));
    expect(pro.getAllByRole("listitem")).toHaveLength(6);
  });

  test("the period toggle re-prices the cards and the currency selector switches currency", () => {
    renderTable();
    fireEvent.click(screen.getByRole("button", { name: "Billed yearly" }));
    expect(
      within(screen.getAllByTestId("sch-plan")[1]).getByTestId(
        "sch-plan-price",
      ),
    ).toHaveTextContent("$490.00/year");
    fireEvent.change(screen.getByLabelText("Currency"), {
      target: { value: "eur" },
    });
    expect(screen.getAllByTestId("sch-plan")).toHaveLength(2);
    expect(
      within(screen.getAllByTestId("sch-plan")[1]).getByTestId(
        "sch-plan-price",
      ),
    ).toHaveTextContent("€450.00/year");
  });

  test("hands the selection to onSelectPlan", () => {
    const onSelectPlan = vi.fn();
    renderTable(publicCatalog(), { onSelectPlan });
    fireEvent.click(screen.getByRole("button", { name: "Start 14-day trial" }));
    expect(onSelectPlan).toHaveBeenCalledWith(
      expect.objectContaining({ id: "plan_pro" }),
      { period: "month", currency: "usd", priceId: "price_pro_m" },
    );
  });

  test("renders CTAs as links when a URL is given", () => {
    renderTable(publicCatalog(), {
      callToActionUrl: "/signup",
      callToActionTarget: "_self",
    });
    const pro = within(screen.getAllByTestId("sch-plan")[1]);
    expect(
      pro.getByRole("link", { name: "Start 14-day trial" }),
    ).toHaveAttribute("href", "/signup");
  });

  test("add-ons render with their own CTAs and one-time prices", () => {
    renderTable();
    const addOns = screen.getAllByTestId("sch-add-on");
    expect(addOns).toHaveLength(2);
    expect(within(addOns[1]).getByTestId("sch-plan-price")).toHaveTextContent(
      "$500.00/one-time",
    );
    expect(
      within(addOns[0]).getByRole("button", { name: "Choose add-on" }),
    ).toBeInTheDocument();
  });

  test("the add-ons section can be hidden", () => {
    renderTable(publicCatalog(), { showAddOns: false });
    expect(screen.queryByTestId("sch-add-on")).not.toBeInTheDocument();
  });

  test("company tier: current plan, active badge, and disabled invalid plans", () => {
    const catalog = proCompanyCatalog();
    catalog.plans[0] = {
      ...catalog.plans[0],
      valid: false,
      invalidReason: "feature_usage_exceeded",
      usageViolations: [
        { featureId: "f", featureName: "API calls", usage: 5, limit: 1 },
      ],
    };
    renderTable(catalog);
    const [free, pro, enterprise] = screen.getAllByTestId("sch-plan");
    expect(within(pro).getByText("Current plan")).toBeInTheDocument();
    expect(within(pro).getByText("Active")).toBeInTheDocument();
    expect(
      within(free).getByRole("button", { name: "Over plan limit" }),
    ).toBeDisabled();
    expect(
      within(free).getByText("API calls usage is over the limit."),
    ).toBeInTheDocument();
    expect(
      within(enterprise).getByRole("button", { name: "Choose plan" }),
    ).toBeEnabled();
  });

  test("display toggles: monthly equivalent and zero as free", () => {
    renderTable(publicCatalog(), {
      defaultPeriod: "year",
      showAsMonthlyPrices: true,
      showZeroPriceAsFree: true,
    });
    const [free, pro] = screen.getAllByTestId("sch-plan");
    expect(within(free).getByTestId("sch-plan-price")).toHaveTextContent(
      "Free",
    );
    expect(within(pro).getByTestId("sch-plan-price")).toHaveTextContent(
      "$40.83/month, billed yearly",
    );
  });
});
