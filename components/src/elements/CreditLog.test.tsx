import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
  type CreditLedgerQuery,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { CreditLog, type CreditLogProps } from "./CreditLog";
import { LOG_NOW, creditLedgerEntry } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

const L = "en-US";

function renderLog(
  data: BillingData = SCENARIOS.creditLog(),
  props: CreditLogProps = {},
  handlers: {
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
    onLoadMoreCreditLedger?: (query: CreditLedgerQuery) => void;
  } = {},
) {
  return render(
    <BillingDataProvider
      data={data}
      onLoadMoreCreditLedger={handlers.onLoadMoreCreditLedger}
      status={handlers.status}
    >
      <CreditLog locale={L} {...props} />
    </BillingDataProvider>,
  );
}

const entries = () => screen.getAllByTestId("schematic-credit-log-entry");

beforeEach(() => {
  vi.useFakeTimers({ now: LOG_NOW, toFake: ["Date"] });
});

afterEach(() => {
  vi.useRealTimers();
});

describe("CreditLog", () => {
  test("says the log is loading, in three skeleton rows", () => {
    const { container } = renderLog({});
    expect(
      screen.getByText("Loading credit activity").closest("[data-state]"),
    ).toHaveAttribute("data-state", "pending");
    expect(container.querySelectorAll(".schematic-skeleton__row")).toHaveLength(
      3,
    );
  });

  test("says there is nothing yet, with no link", () => {
    renderLog({ creditLedger: { entries: [], hasMore: false } });
    expect(screen.getByText("No credit activity yet")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "See full log" })).toBeNull();
  });

  test("shows the newest three, naming their one credit in the header", () => {
    renderLog();
    expect(
      screen.getByRole("heading", { level: 2, name: "Credit activity" }),
    ).toBeInTheDocument();
    const rows = entries();
    expect(rows).toHaveLength(3);
    expect(rows[0]).toHaveTextContent(
      "Dashboard promptToday, 2:14 PM · Fynn Glover−1.5",
    );
    expect(rows[1]).toHaveTextContent(
      "Auto top-up, Booster packToday, 1:52 PM · Auto top-up+1,000",
    );
    expect(
      rows[1].querySelector(".schematic-credit-log__amount--positive"),
    ).not.toBeNull();
    expect(rows[2]).toHaveTextContent("Video generation");
    expect(rows[0]).not.toHaveTextContent("AI credit");
    expect(
      document.querySelector(".schematic-credit-log__credit-name"),
    ).toHaveTextContent("AI credits");
  });

  test("leaves who out when asked, and for a draw sent without a user", () => {
    renderLog(undefined, { showUser: false, limit: 1 });
    expect(entries()[0]).toHaveTextContent("Today, 2:14 PM−1.5");
    expect(entries()[0]).not.toHaveTextContent("Fynn");
  });

  test("opens the full log in place, and collapses back", () => {
    renderLog();
    fireEvent.click(screen.getByRole("button", { name: "See full log" }));
    const table = screen.getByRole("table", { name: "Credit activity" });
    expect(
      within(table)
        .getAllByRole("columnheader")
        .map((cell) => cell.textContent),
    ).toEqual(["Date", "Activity", "By", "Amount"]);
    expect(screen.queryByRole("columnheader", { name: "Credit" })).toBeNull();
    const rows = within(table).getAllByTestId("schematic-credit-log-entry");
    expect(rows).toHaveLength(8);
    expect(rows[1]).toHaveTextContent("Auto top-up, Booster pack");
    expect(rows[5]).toHaveTextContent("Yesterday, 9:15 AM");
    expect(rows[5].querySelectorAll("td")[2]).toHaveTextContent("—");
    expect(rows[6]).toHaveTextContent("Jul 29, 3:00 PMPlan grantPlan+5,000");
    expect(rows[7]).toHaveTextContent("Unused credits reset");

    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "See less" }));
    expect(screen.queryByRole("table")).toBeNull();
    expect(entries()).toHaveLength(3);
  });

  test("names each row's credit when the log spans several", () => {
    renderLog(
      {
        creditLedger: {
          entries: [
            creditLedgerEntry({ amount: -1 }),
            creditLedgerEntry({
              amount: -10,
              credit: { id: "bcr_export", name: "Export credit" },
              feature: { id: "feat_csv", name: "CSV export" },
            }),
          ],
          hasMore: true,
        },
      },
      { limit: 1 },
    );
    expect(
      document.querySelector(".schematic-credit-log__credit-name"),
    ).toBeNull();
    expect(entries()[0]).toHaveTextContent(
      "Video generationToday, 2:50 PM · Ada · AI credits−1",
    );
    fireEvent.click(screen.getByRole("button", { name: "See full log" }));
    expect(
      screen.getAllByRole("columnheader").map((cell) => cell.textContent),
    ).toEqual(["Date", "Activity", "By", "Credit", "Amount"]);
    const cells = entries()[1].querySelectorAll("td");
    expect(cells[3]).toHaveTextContent("Export credits");
    expect(cells[4]).toHaveTextContent(/^−10$/);
  });

  test("names each row's credit when the header is hidden", () => {
    renderLog(undefined, { showHeader: false, limit: 1 });
    expect(entries()[0]).toHaveTextContent(
      "Today, 2:14 PM · Fynn Glover · AI credits−1.5",
    );
  });

  test("pages the full log with the query it reads", () => {
    const onLoadMoreCreditLedger = vi.fn();
    const data = SCENARIOS.creditLog();
    renderLog(
      {
        creditLedger: {
          entries: data.creditLedger?.entries ?? [],
          hasMore: true,
        },
      },
      { credits: ["bcr_ai"], showGrants: false, showUser: false },
      { onLoadMoreCreditLedger },
    );
    fireEvent.click(screen.getByRole("button", { name: "See full log" }));
    expect(screen.queryByRole("columnheader", { name: "By" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMoreCreditLedger).toHaveBeenCalledWith({
      credits: ["bcr_ai"],
      includeGrants: false,
    });
  });

  test("offers the full log when more rows wait on the server", () => {
    renderLog(
      { creditLedger: { entries: [creditLedgerEntry()], hasMore: true } },
      { limit: 3 },
    );
    expect(
      screen.getByRole("button", { name: "See full log" }),
    ).toBeInTheDocument();
  });

  test("hands the full log to the host", () => {
    const onSeeAll = vi.fn();
    const { unmount } = renderLog(undefined, { onSeeAll });
    expect(screen.queryByRole("button", { name: "See full log" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "See all" }));
    expect(onSeeAll).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("table")).toBeNull();
    unmount();

    renderLog(undefined, { seeAllUrl: "/credits/log", seeAllTarget: "_blank" });
    const link = screen.getByRole("link", { name: "See all" });
    expect(link).toHaveAttribute("href", "/credits/log");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  test("labels the list by its copy when the heading is hidden", () => {
    renderLog(undefined, { showHeader: false });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(
      screen.getByRole("list", { name: "Credit activity" }),
    ).toBeInTheDocument();
  });

  test("says the log is unavailable on a 404, and retries otherwise", () => {
    const { unmount } = renderLog({}, undefined, {
      status: {
        creditLedger: {
          error: new SchematicApiError(404, "/company/credits/ledger", null),
        },
      },
    });
    expect(
      screen.getByText("Credit activity is not available for this account."),
    ).toBeInTheDocument();
    unmount();

    renderLog({}, undefined, {
      status: { creditLedger: { error: new Error("boom") } },
    });
    expect(
      screen.getByText("There was a problem retrieving your credit activity."),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("takes the host's copy", () => {
    renderLog(undefined, {
      strings: { creditLogHeader: "Activity", creditLogToday: "Now, {{time}}" },
    });
    expect(
      screen.getByRole("heading", { name: "Activity" }),
    ).toBeInTheDocument();
    expect(entries()[0]).toHaveTextContent("Now, 2:14 PM");
  });
});
