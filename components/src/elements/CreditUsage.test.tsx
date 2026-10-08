import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
  type CreditUserUsage,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { CreditUsage, type CreditUsageProps } from "./CreditUsage";
import { creditUserUsage } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function renderCredits(
  data: BillingData = SCENARIOS.credits(),
  props: CreditUsageProps = {},
  handlers: {
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
    creditUserUsage?: Record<string, CreditUserUsage>;
  } = {},
) {
  return render(
    <BillingDataProvider
      creditUserUsage={handlers.creditUserUsage}
      data={data}
      status={handlers.status}
    >
      <CreditUsage locale={L} {...props} />
    </BillingDataProvider>,
  );
}

function section(name: string): HTMLElement {
  return screen.getByRole("region", { name });
}

describe("CreditUsage", () => {
  test("says credits are loading", () => {
    renderCredits({});
    expect(
      screen.getByText("Loading credits").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
  });

  test("says credits are not available on a 404", () => {
    renderCredits(
      {},
      {},
      {
        status: {
          creditBalances: {
            error: new SchematicApiError(404, "/company/credits", "not found"),
          },
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Credits are not available for this account.",
    );
  });

  test("renders nothing without a credit", () => {
    const { container } = renderCredits({ creditBalances: [] });
    expect(container).toBeEmptyDOMElement();
  });

  test("a card per credit, with no heading by default", () => {
    renderCredits(undefined, { headingLevel: 3 });
    expect(screen.queryByRole("heading", { name: "Credits" })).toBeNull();
    const credits = screen.getAllByTestId("schematic-credit");
    expect(credits).toHaveLength(3);
    for (const credit of credits) {
      expect(credit).toHaveClass("schematic-card");
    }
    expect(
      screen.getByRole("heading", { level: 3, name: "AI credit" }),
    ).toBeInTheDocument();
  });

  test("shows the heading on request, with each name one level below", () => {
    renderCredits(undefined, { showHeader: true });
    expect(
      screen.getByRole("heading", { level: 2, name: "Credits" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("heading", { level: 3, name: "AI credit" }),
    ).toBeInTheDocument();
  });

  test("a balance reads what is left, to ten fraction digits", () => {
    renderCredits();
    expect(section("AI credit")).toHaveTextContent(
      "850.25 AI credits remaining",
    );
  });

  test("the composition says how the plan's grants add up and when they renew", () => {
    renderCredits();
    expect(section("AI credit")).toHaveTextContent(
      "Your plan includes 220 AI credits/mo — 12 Seats × 10 + 100 company grant. Renews on the 1st.",
    );
  });

  test("Buy More calls back with the credit, and only where a bundle sells it", () => {
    const onBuyMore = vi.fn();
    renderCredits(undefined, { onBuyMore });
    fireEvent.click(
      within(section("AI credit")).getByRole("button", { name: "Buy More" }),
    );
    expect(onBuyMore).toHaveBeenCalledWith(
      expect.objectContaining({ creditId: "bcr_ai" }),
    );
    expect(within(section("Export credit")).queryByText("Buy More")).toBeNull();
  });

  test("Buy More is absent without a callback or a URL", () => {
    renderCredits();
    expect(screen.queryByText("Buy More")).toBeNull();
  });

  test("showExpiration false leaves the grants' dates out", () => {
    renderCredits(undefined, { showExpiration: false });
    const ai = section("AI credit");
    fireEvent.click(
      within(ai).getByRole("button", { name: "See balance details" }),
    );
    const [first] = within(ai).getAllByTestId("schematic-credit-grant");
    expect(first).toHaveTextContent("500 AI credit bundle purchased");
    expect(first).not.toHaveTextContent("Expires");
  });

  test("the ledger opens on balance details, newest first, worded by reason", () => {
    renderCredits();
    const ai = section("AI credit");
    expect(within(ai).queryByTestId("schematic-credit-grant")).toBeNull();
    fireEvent.click(
      within(ai).getByRole("button", { name: "See balance details" }),
    );
    const rows = within(ai).getAllByTestId("schematic-credit-grant");
    expect(rows[0]).toHaveTextContent(
      "500 AI credit bundle purchased Aug 19, 2026",
    );
    expect(rows[0]).toHaveTextContent("Expires Oct 20, 2026");
    expect(rows[1]).toHaveTextContent("500 AI credits included in plan");
    expect(rows[1]).toHaveTextContent("Resets Aug 31, 2026");
  });

  test("a long ledger shows three, then all, and closing collapses it again", () => {
    renderCredits();
    const exports = section("Export credit");
    fireEvent.click(
      within(exports).getByRole("button", { name: "See balance details" }),
    );
    expect(
      within(exports).getAllByTestId("schematic-credit-grant"),
    ).toHaveLength(3);
    expect(exports).toHaveTextContent("5 promotional Export credits granted");
    expect(exports).toHaveTextContent(
      "500 Export credits auto-topup purchased",
    );
    fireEvent.click(
      within(exports).getByRole("button", { name: "See all (4)" }),
    );
    expect(
      within(exports).getAllByTestId("schematic-credit-grant"),
    ).toHaveLength(4);
    fireEvent.click(
      within(exports).getByRole("button", { name: "Hide balance details" }),
    );
    fireEvent.click(
      within(exports).getByRole("button", { name: "See balance details" }),
    );
    expect(
      within(exports).getAllByTestId("schematic-credit-grant"),
    ).toHaveLength(3);
  });

  test("a plan credit held none of is a zero balance with no ledger or usage by user", () => {
    // The breakdown has data, so only the no-grants rule can hide it.
    renderCredits(
      undefined,
      {},
      { creditUserUsage: { bcr_seat: creditUserUsage() } },
    );
    const seat = section("Seat credit");
    expect(seat).toHaveTextContent("0 Seat credits remaining");
    expect(within(seat).queryByText("See balance details")).toBeNull();
    expect(seat.querySelector(".schematic-usage-by-user")).toBeNull();
  });

  test("consumption by user lists who spent the credit", () => {
    renderCredits(
      undefined,
      { visibleCredits: ["bcr_ai"] },
      {
        creditUserUsage: { bcr_ai: creditUserUsage() },
      },
    );
    const ai = section("AI credit");
    expect(ai).toHaveTextContent(
      "149.75 AI credits used by your team this period",
    );
    const names = Array.from(
      ai.querySelectorAll(".schematic-usage-by-user__name"),
    ).map((n) => n.textContent);
    expect(names).toEqual(["Ada", "Bo", "Cy"]);
  });

  test("consumption by user keeps a small spend's fractions", () => {
    renderCredits(
      undefined,
      { visibleCredits: ["bcr_ai"] },
      {
        creditUserUsage: {
          bcr_ai: creditUserUsage({
            count: 1,
            total: 0.0004,
            unattributed: null,
            users: [
              { name: "Ada", share: 1, used: 0.0004, userId: "user_ada" },
            ],
          }),
        },
      },
    );
    const ai = section("AI credit");
    expect(ai).toHaveTextContent(
      "0.0004 AI credits used by your team this period",
    );
    expect(
      ai.querySelector(".schematic-usage-by-user__amount"),
    ).toHaveTextContent("0.0004 AI credits");
  });

  test("the toggles hide what they name", () => {
    renderCredits(undefined, {
      showDescription: false,
      showHeader: false,
      showIcon: false,
      showUsage: false,
      visibleCredits: ["bcr_ai"],
    });
    expect(screen.queryByRole("heading", { name: "Credits" })).toBeNull();
    const ai = section("AI credit");
    expect(ai.querySelector(".schematic-credit-usage__icon")).toBeNull();
    expect(ai).not.toHaveTextContent("remaining");
    expect(ai).not.toHaveTextContent("Spent running inference");
  });
});
