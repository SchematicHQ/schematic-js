import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingData,
  type InvoiceQuery,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { Invoices, type InvoicesProps } from "./Invoices";
import { daysFromNow, invoice, invoicePage } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";
import { deriveInvoiceList, formatDate } from "./model";

const L = "en-US";
const longDate = (days: number) => formatDate(daysFromNow(days), L);

function renderInvoices(
  data: BillingData = SCENARIOS.pro(),
  props: InvoicesProps = {},
  handlers: {
    onLoadMoreInvoices?: (query: InvoiceQuery) => void;
    status?: React.ComponentProps<typeof BillingDataProvider>["status"];
    locale?: string;
    translate?: React.ComponentProps<typeof BillingDataProvider>["translate"];
  } = {},
) {
  return render(
    <BillingDataProvider
      data={data}
      locale={handlers.locale}
      status={handlers.status}
      translate={handlers.translate}
      onLoadMoreInvoices={handlers.onLoadMoreInvoices}
    >
      <Invoices locale={L} {...props} />
    </BillingDataProvider>,
  );
}

describe("Invoices", () => {
  test("renders a skeleton while the invoices load, and says so", () => {
    renderInvoices({});
    // The label is text in the card rather than a live region: it is read by
    // anyone who navigates there, and promises no announcement, because
    // nothing announces the rows arriving.
    const label = screen.getByText("Loading invoices");
    const pending = label.closest("[data-state]");
    expect(pending).toHaveAttribute("data-state", "pending");
    expect(pending).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("renders the error copy with Try again, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <BillingDataProvider
        data={{}}
        status={{ invoices: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <Invoices />
      </BillingDataProvider>,
    );
    // The embed's copy, not the error's own message: a reader is told what
    // went wrong in their terms, not the network's.
    const alert = screen.getByRole("alert");
    expect(alert).toHaveTextContent(
      "There was a problem retrieving your invoices.",
    );
    expect(alert).not.toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRefetch).toHaveBeenCalledWith("invoices");
  });

  test("reads a 404 as the feature being unavailable", () => {
    // The account is not on the flag that serves company reads, so the card
    // says something truer than "a problem". Retry stays: the same status
    // answers a company the token cannot resolve, which a fresh token fixes.
    render(
      <BillingDataProvider
        data={{}}
        status={{
          invoices: {
            error: new SchematicApiError(404, "/company/invoices", {}),
          },
        }}
      >
        <Invoices />
      </BillingDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Invoices are not available for this account.",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("a 404 under rows still on screen reads as an ordinary failure", () => {
    // "Not available for this account" beneath a list of the account's
    // invoices would contradict itself.
    renderInvoices(
      SCENARIOS.pro(),
      { limit: 1 },
      {
        status: {
          invoices: {
            error: new SchematicApiError(404, "/company/invoices", {}),
          },
        },
      },
    );
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(1);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "There was a problem retrieving your invoices.",
    );
  });

  test("asks the translator for error copy only when there is an error", () => {
    // A host's `translate` that lacks the key would otherwise report a miss
    // on every render of a healthy card, for a string never displayed.
    const onMissingString = vi.fn();
    render(
      <BillingDataProvider
        data={SCENARIOS.pro()}
        onMissingString={onMissingString}
        translate={() => undefined}
      >
        <Invoices />
      </BillingDataProvider>,
    );
    expect(onMissingString).not.toHaveBeenCalledWith("invoicesError");
    expect(onMissingString).not.toHaveBeenCalledWith("invoicesUnavailable");
  });

  test("any other HTTP failure keeps the generic copy and the retry", () => {
    render(
      <BillingDataProvider
        data={{}}
        status={{
          invoices: {
            error: new SchematicApiError(500, "/company/invoices", {}),
          },
        }}
      >
        <Invoices />
      </BillingDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "There was a problem retrieving your invoices.",
    );
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("logs the error it does not show, so a mis-wired page is diagnosable", () => {
    // The copy on screen is fixed; the message that says *why* — a missing
    // provider, a 404 — reaches the console in development.
    const log = vi.spyOn(console, "error").mockImplementation(() => {});
    const error = new Error("Boom");
    render(
      <BillingDataProvider data={{}} status={{ invoices: { error } }}>
        <Invoices />
      </BillingDataProvider>,
    );
    expect(log).toHaveBeenCalledWith(
      "Schematic: There was a problem retrieving your invoices.",
      error,
    );
    log.mockRestore();
  });

  test("renders the empty state with the header", () => {
    renderInvoices(SCENARIOS.trialing());
    expect(
      screen.getByRole("heading", { name: "Invoices" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No invoices created yet")).toBeInTheDocument();
    expect(screen.queryByRole("list")).toBeNull();
  });

  test("renders only the heading in the header, with no count beside it", () => {
    renderInvoices(SCENARIOS.pro(), { limit: 2 });
    const header = screen.getByRole("heading", { name: "Invoices" })
      .parentElement as HTMLElement;
    expect(header).toHaveTextContent(/^Invoices$/);
  });

  test("lays each row out as a dated link and its amount, with no column headers", () => {
    renderInvoices(SCENARIOS.pro(), { limit: 2 });
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByRole("columnheader")).toBeNull();
    expect(screen.queryByText("Date")).toBeNull();
    expect(screen.queryByText("Amount")).toBeNull();

    const rows = screen.getAllByTestId("schematic-invoice");
    expect(rows).toHaveLength(2);
    const link = within(rows[0]).getByRole("link", { name: longDate(-10) });
    expect(link).toHaveAttribute("href", "https://invoice.example/inv");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(rows[0]).toHaveTextContent("$68.00");
  });

  test("explains each amount on hover: a charge, or a credit in parentheses", () => {
    renderInvoices(SCENARIOS.pro(), { collapsible: false });
    const rows = screen.getAllByTestId("schematic-invoice");
    const charge = within(rows[0]).getByTitle(
      "Charge — you were billed this amount",
    );
    expect(charge).toHaveTextContent("$68.00");
    const credit = within(rows[2]).getByTitle(
      "Credit — this amount was returned to your account, typically due to a plan change or proration",
    );
    expect(credit).toHaveTextContent("($15.00)");
  });

  test("toggles between See more and See less, and pages once expanded", () => {
    const onLoadMoreInvoices = vi.fn();
    renderInvoices(SCENARIOS.pro(), { limit: 2 }, { onLoadMoreInvoices });
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(2);
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();

    const toggle = screen.getByRole("button", { name: "See more" });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    fireEvent.click(toggle);
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(3);
    expect(screen.getByRole("button", { name: "See less" })).toHaveAttribute(
      "aria-expanded",
      "true",
    );

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMoreInvoices).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "See less" }));
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(2);
  });

  test("renders every row and Load more when not collapsible", () => {
    renderInvoices(SCENARIOS.pro(), { collapsible: false });
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "See more" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();
  });

  test("hides Load more when the history is complete", () => {
    const data = SCENARIOS.pro();
    data.invoices = invoicePage(data.invoices!.invoices, false);
    renderInvoices(data, { limit: 5 });
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(3);
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("falls back to the created date when the due date is malformed", () => {
    // An Invalid Date is not absent, so `??` keeps it: the row would lose
    // both its date and its link with a good created date sitting right
    // there.
    const broken = invoice({
      id: "inv_broken",
      url: "https://invoice/x",
      createdAt: daysFromNow(-5),
    });
    (broken as { dueDate?: Date }).dueDate = new Date("not a date");
    renderInvoices({ invoices: invoicePage([broken]) });
    expect(screen.getByRole("link")).toHaveTextContent(longDate(-5));
  });

  test("a row with no usable date carries null rather than an Invalid Date", () => {
    // `date` is public API for hosts formatting their own markup, and
    // Intl.format throws on an Invalid Date — from inside their render.
    const broken = invoice({ id: "inv_broken" });
    (broken as { createdAt: Date }).createdAt = new Date("not a date");
    (broken as { dueDate?: Date }).dueDate = new Date("also not a date");
    const [row] = deriveInvoiceList(invoicePage([broken]), { locale: L }).rows;
    expect(row.date).toBeNull();
    expect(row.dateText).toBe("");
  });

  test("keeps the invoice reachable when its dates are unusable", () => {
    // The URL is fine; only the dates are not. Dropping the link would put
    // the hosted invoice out of reach over a formatting problem.
    const broken = invoice({ id: "inv_broken", url: "https://invoice/x" });
    (broken as { createdAt: Date }).createdAt = new Date("not a date");
    (broken as { dueDate?: Date }).dueDate = undefined;
    renderInvoices({ invoices: invoicePage([broken]) });
    expect(screen.getByRole("link", { name: "View invoice" })).toHaveAttribute(
      "href",
      "https://invoice/x",
    );
  });

  test("renders a row with unusable dates and no URL as plain text", () => {
    const broken = invoice({ id: "inv_broken", url: null });
    (broken as { createdAt: Date }).createdAt = new Date("not a date");
    (broken as { dueDate?: Date }).dueDate = undefined;
    renderInvoices({ invoices: invoicePage([broken]) });
    expect(screen.getByTestId("schematic-invoice")).toBeInTheDocument();
    expect(screen.queryByRole("link")).toBeNull();
  });

  test("falls back to the created date and plain text without a URL", () => {
    const data = SCENARIOS.pro();
    data.invoices = invoicePage([
      invoice({ dueDate: null, createdAt: daysFromNow(-1), url: null }),
    ]);
    renderInvoices(data);
    const row = screen.getByTestId("schematic-invoice");
    expect(within(row).queryByRole("link")).toBeNull();
    expect(row).toHaveTextContent(longDate(-1));
  });

  test("display toggles hide the header, the dates, and the amounts", () => {
    renderInvoices(SCENARIOS.pro(), {
      showAmount: false,
      showDate: false,
      showHeader: false,
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
    expect(screen.queryByText("$68.00")).toBeNull();
  });

  test("passes its query to the hook and to paging", () => {
    const onLoadMoreInvoices = vi.fn();
    renderInvoices(
      SCENARIOS.pro(),
      { collapsible: false, query: { includePending: true } },
      { onLoadMoreInvoices },
    );
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMoreInvoices).toHaveBeenCalledWith({ includePending: true });
  });

  test("reports a failure under the rows it still has", () => {
    renderInvoices(
      SCENARIOS.pro(),
      { limit: 1 },
      { status: { invoices: { error: new Error("network down") } } },
    );
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(1);
    const note = screen.getByRole("alert");
    expect(note).toHaveTextContent(
      "There was a problem retrieving your invoices.",
    );
    expect(note).toHaveClass("schematic-status-note");
  });

  test("disables Load more while a page is on the wire", () => {
    renderInvoices(
      SCENARIOS.pro(),
      { collapsible: false },
      { status: { invoices: { isPending: true } } },
    );
    expect(screen.getByRole("button", { name: "Load more" })).toBeDisabled();
  });

  // The copy pipeline — overrides, translate, misses, locale — is
  // elements/localization.test.tsx.
  test("renders the heading at the level the host asks for", () => {
    renderInvoices(SCENARIOS.pro(), { headingLevel: 3 });
    expect(
      screen.getByRole("heading", { level: 3, name: "Invoices" }),
    ).toBeInTheDocument();
  });

  test("names the list, with or without a visible header", () => {
    // The heading is a sibling of the list, so nothing associates them on
    // its own — and a card asked to hide its header has no heading at all.
    renderInvoices(SCENARIOS.pro());
    expect(screen.getByRole("list", { name: "Invoices" })).toBeInTheDocument();

    renderInvoices(SCENARIOS.pro(), { showHeader: false });
    expect(screen.getAllByRole("list", { name: "Invoices" })).toHaveLength(2);
  });

  test("stays expanded when Load more takes the list past the limit", () => {
    // The first page can be under `limit`, so "Load more" shows while the
    // list is nominally collapsed. Appending must not fold it back up and
    // replace the button that was just clicked with "See more".
    const onLoadMoreInvoices = vi.fn();
    const page = (loaded: number, hasMore: boolean) => ({
      invoices: Array.from({ length: loaded }, () => invoice()),
      count: hasMore ? loaded + 12 : loaded,
      hasMore,
    });
    const view = render(
      <BillingDataProvider
        data={{ invoices: page(12, true) }}
        onLoadMoreInvoices={onLoadMoreInvoices}
      >
        <Invoices limit={20} locale={L} />
      </BillingDataProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMoreInvoices).toHaveBeenCalled();

    view.rerender(
      <BillingDataProvider
        data={{ invoices: page(24, false) }}
        onLoadMoreInvoices={onLoadMoreInvoices}
      >
        <Invoices limit={20} locale={L} />
      </BillingDataProvider>,
    );
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(24);
    expect(screen.queryByRole("button", { name: "See more" })).toBeNull();
  });

  test("renames the heading from the strings prop", () => {
    renderInvoices(SCENARIOS.pro(), {
      strings: { invoicesHeader: "Billing history" },
    });
    expect(
      screen.getByRole("heading", { name: "Billing history" }),
    ).toBeInTheDocument();
  });
});
