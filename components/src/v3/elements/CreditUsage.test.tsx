import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import type { CatalogData } from "../contract";
import { CatalogDataProvider } from "../data";
import {
  creditBalance,
  creditGrantRow,
  creditRef,
  daysFromNow,
} from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";
import { formatDate } from "../model";

import { CreditUsage, type CreditUsageProps } from "./CreditUsage";

const L = "en-US";
const longDate = (days: number) => formatDate(daysFromNow(days), L);
const shortDate = (days: number) =>
  formatDate(daysFromNow(days), L, { month: "short" });

function renderCredits(
  data: CatalogData = SCENARIOS.pro(),
  props: CreditUsageProps = {},
  status?: React.ComponentProps<typeof CatalogDataProvider>["status"],
) {
  return render(
    <CatalogDataProvider data={data} status={status}>
      <CreditUsage locale={L} {...props} />
    </CatalogDataProvider>,
  );
}

/** A balance with one grant of every ledger kind, newest first by reason. */
function ledgerData(): CatalogData {
  const data = SCENARIOS.pro();
  const credit = {
    ...creditRef({
      id: "credit_ai",
      name: "AI credits",
      singularName: "AI credit",
      pluralName: "AI credits",
    }),
    description: "",
  };
  data.credits = [
    creditBalance({
      credit,
      grants: [
        creditGrantRow({
          id: "cg_plan",
          reason: "plan",
          quantity: 500,
          quantityUsed: 0,
          quantityRemaining: 500,
          createdAt: daysFromNow(-30),
          expiresAt: daysFromNow(1),
        }),
        creditGrantRow({
          id: "cg_topup",
          reason: "billing_credit_auto_topup",
          plan: null,
          bundle: { id: "b", name: "Top-up" },
          quantity: 100,
          quantityUsed: 0,
          quantityRemaining: 100,
          renewalPeriod: null,
          createdAt: daysFromNow(-2),
          expiresAt: daysFromNow(40),
        }),
        creditGrantRow({
          id: "cg_promo",
          reason: "free",
          plan: null,
          quantity: 50,
          quantityUsed: 0,
          quantityRemaining: 50,
          renewalPeriod: null,
          createdAt: daysFromNow(-5),
          expiresAt: null,
        }),
        creditGrantRow({
          id: "cg_adjust",
          reason: "adjustment",
          plan: null,
          quantity: 25,
          quantityUsed: 0,
          quantityRemaining: 25,
          renewalPeriod: null,
          createdAt: daysFromNow(-9),
          expiresAt: null,
        }),
      ],
    }),
  ];
  return data;
}

describe("CreditUsage", () => {
  test("renders a skeleton while the balances load", () => {
    renderCredits({});
    expect(screen.getByLabelText("Loading credits")).toBeInTheDocument();
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <CatalogDataProvider
        data={{}}
        status={{ credits: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <CreditUsage />
      </CatalogDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRefetch).toHaveBeenCalledWith("credits");
  });

  test("renders the empty state when the company holds no credits", () => {
    renderCredits(SCENARIOS.free());
    expect(screen.getByText("No credits")).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { name: "Credits" }),
    ).toBeInTheDocument();
  });

  test("renders the meter, usage, remaining, and expiry for each credit", () => {
    renderCredits();
    const card = within(screen.getByTestId("sch-credit"));
    expect(
      card.getByRole("heading", { name: "AI credits" }),
    ).toBeInTheDocument();
    expect(card.getByText("Spend on AI features.")).toBeInTheDocument();
    expect(card.getByRole("meter", { name: "AI credits" })).toHaveAttribute(
      "aria-valuenow",
      "12",
    );
    expect(card.getByTestId("sch-credit-usage")).toHaveTextContent(
      "120 / 1,000",
    );
    expect(card.getByTestId("sch-credit-remaining")).toHaveTextContent(
      "880 AI credits remaining",
    );
    expect(card.getByText(`Expires ${longDate(20)}`)).toBeInTheDocument();
  });

  test("the ledger toggles open and lists grants newest first", () => {
    renderCredits();
    const ledger = screen.getByTestId("sch-credit-ledger");
    expect(ledger).not.toHaveAttribute("open");
    fireEvent.click(screen.getByText("See balance details"));
    expect(ledger).toHaveAttribute("open");
    const rows = within(ledger).getAllByTestId("sch-credit-grant");
    expect(rows).toHaveLength(2);
    expect(rows[0]).toHaveTextContent(
      `500 AI credits bundle purchased ${shortDate(-3)}`,
    );
    expect(rows[0]).not.toHaveTextContent(/Expires|Resets/);
    expect(rows[1]).toHaveTextContent("500 AI credits included in plan");
    expect(rows[1]).toHaveTextContent(`Resets ${shortDate(20)}`);
    fireEvent.click(screen.getByText("Hide balance details"));
    expect(ledger).not.toHaveAttribute("open");
  });

  test("renders every ledger kind and collapses long ledgers", () => {
    renderCredits(ledgerData());
    fireEvent.click(screen.getByText("See balance details"));
    let rows = screen.getAllByTestId("sch-credit-grant");
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent(
      `100 AI credits auto top-up purchased ${shortDate(-2)}`,
    );
    expect(rows[0]).toHaveTextContent(`Expires ${shortDate(40)}`);
    expect(rows[1]).toHaveTextContent(
      `50 promotional AI credits granted ${shortDate(-5)}`,
    );
    expect(rows[2]).toHaveTextContent(`25 AI credits added ${shortDate(-9)}`);
    fireEvent.click(screen.getByRole("button", { name: "See all (4)" }));
    rows = screen.getAllByTestId("sch-credit-grant");
    expect(rows).toHaveLength(4);
    expect(rows[3]).toHaveTextContent("500 AI credits included in plan");
    fireEvent.click(screen.getByRole("button", { name: "Hide all" }));
    expect(screen.getAllByTestId("sch-credit-grant")).toHaveLength(3);
  });

  test("honours visibleGrantCount", () => {
    renderCredits(ledgerData(), { visibleGrantCount: 1 });
    expect(screen.getAllByTestId("sch-credit-grant")).toHaveLength(1);
    expect(
      screen.getByRole("button", { name: "See all (4)" }),
    ).toBeInTheDocument();
  });

  test("offers Buy more with the compatible bundles and hands them to onBuyBundle", () => {
    const onBuyBundle = vi.fn();
    renderCredits(SCENARIOS.pro(), { onBuyBundle });
    const bundles = within(screen.getByTestId("sch-credit-bundles"));
    expect(bundles.getByText("500 AI credits — $25.00")).toBeInTheDocument();
    expect(bundles.getByText("2,000 AI credits — $80.00")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Buy more" }));
    expect(onBuyBundle).toHaveBeenCalledTimes(1);
    const [summary, offered] = onBuyBundle.mock.calls[0];
    expect(summary.credit.id).toBe("credit_ai");
    expect(offered.map((b: { id: string }) => b.id)).toEqual([
      "bundle_ai_500",
      "bundle_ai_2000",
    ]);
  });

  test("renders Buy more as a link when a URL is given", () => {
    renderCredits(SCENARIOS.pro(), {
      buyMoreUrl: "/buy",
      buyMoreTarget: "_blank",
    });
    const link = screen.getByRole("link", { name: "Buy more" });
    expect(link).toHaveAttribute("href", "/buy");
    expect(link).toHaveAttribute("target", "_blank");
  });

  test("hides Buy more when the catalog cannot check out", () => {
    const data = SCENARIOS.pro();
    data.catalog = {
      ...data.catalog!,
      capabilities: { checkout: false },
    };
    renderCredits(data);
    expect(screen.queryByText("Buy more")).not.toBeInTheDocument();
    expect(screen.queryByTestId("sch-credit-bundles")).not.toBeInTheDocument();
  });

  test("hides Buy more when no bundle is compatible with the current plan", () => {
    const data = SCENARIOS.free();
    data.credits = SCENARIOS.pro().credits;
    renderCredits(data);
    expect(screen.getByTestId("sch-credit")).toBeInTheDocument();
    expect(screen.queryByText("Buy more")).not.toBeInTheDocument();
  });

  test("renders without a catalog or company", () => {
    renderCredits({ credits: SCENARIOS.pro().credits });
    expect(screen.getByTestId("sch-credit-remaining")).toHaveTextContent(
      "880 AI credits remaining",
    );
    expect(screen.queryByText("Buy more")).not.toBeInTheDocument();
  });

  test("filters and orders by visibleCredits", () => {
    renderCredits(SCENARIOS.pro(), { visibleCredits: ["credit_other"] });
    expect(screen.getByText("No credits")).toBeInTheDocument();
  });

  test("display toggles hide the header, icon, description, ledger, expiry, and bundles", () => {
    renderCredits(SCENARIOS.pro(), {
      headerText: "Balances",
      showBundles: false,
      showDescription: false,
      showExpiry: false,
      showHeader: false,
      showIcons: false,
      showLedger: false,
    });
    expect(screen.queryByRole("heading", { name: "Balances" })).toBeNull();
    expect(screen.queryByText("Spend on AI features.")).toBeNull();
    expect(screen.queryByText(/^Expires/)).toBeNull();
    expect(screen.queryByTestId("sch-credit-ledger")).toBeNull();
    expect(screen.queryByTestId("sch-credit-bundles")).toBeNull();
    expect(document.querySelector(".schematic-icon")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Buy more" }),
    ).toBeInTheDocument();
  });

  test("uses the custom header text", () => {
    renderCredits(SCENARIOS.pro(), { headerText: "Balances" });
    expect(
      screen.getByRole("heading", { name: "Balances" }),
    ).toBeInTheDocument();
  });

  test("warns at the configured percent", () => {
    renderCredits(SCENARIOS.pro(), { warningPercent: 10 });
    expect(screen.getByRole("meter")).toHaveClass("schematic-meter--warning");
  });
});
