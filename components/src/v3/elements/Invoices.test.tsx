import {
  CompanyDataProvider,
  type CompanyData,
  type Invoice,
  type InvoiceQuery,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { vi } from "vitest";

import { daysFromNow, invoice, invoicePage } from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";
import { formatDate } from "../model";

import { Invoices, type InvoicesProps } from "./Invoices";

const L = "en-US";
const longDate = (days: number) => formatDate(daysFromNow(days), L);

function renderInvoices(
  data: CompanyData = SCENARIOS.pro(),
  props: InvoicesProps = {},
  handlers: {
    onLoadMoreInvoices?: (query: InvoiceQuery) => void;
    status?: React.ComponentProps<typeof CompanyDataProvider>["status"];
    locale?: string;
    translate?: React.ComponentProps<typeof CompanyDataProvider>["translate"];
  } = {},
) {
  return render(
    <CompanyDataProvider
      data={data}
      locale={handlers.locale}
      status={handlers.status}
      translate={handlers.translate}
      onLoadMoreInvoices={handlers.onLoadMoreInvoices}
    >
      <Invoices locale={L} {...props} />
    </CompanyDataProvider>,
  );
}

describe("Invoices", () => {
  test("renders a skeleton while the invoices load", () => {
    renderInvoices({});
    // By role, not by label: `getByLabelText` matches the attribute whether or
    // not a screen reader would ever read it.
    const pending = screen.getByRole("status", { name: "Loading invoices" });
    expect(pending).toHaveAttribute("data-state", "pending");
    expect(pending).toHaveAttribute("aria-busy", "true");
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <CompanyDataProvider
        data={{}}
        status={{ invoices: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <Invoices />
      </CompanyDataProvider>,
    );
    expect(screen.getByRole("alert")).toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRefetch).toHaveBeenCalledWith("invoices");
  });

  test("renders the empty state with the header", () => {
    renderInvoices(SCENARIOS.trialing());
    expect(
      screen.getByRole("heading", { name: "Invoices" }),
    ).toBeInTheDocument();
    expect(screen.getByText("No invoices yet")).toBeInTheDocument();
    expect(screen.queryByRole("table")).toBeNull();
  });

  test("collapses to the limit, expands, and pages when more is available", () => {
    const onLoadMoreInvoices = vi.fn();
    renderInvoices(SCENARIOS.pro(), { limit: 2 }, { onLoadMoreInvoices });
    expect(
      screen.getByRole("columnheader", { name: "Date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Amount" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull();

    let rows = screen.getAllByTestId("schematic-invoice");
    expect(rows).toHaveLength(2);
    const link = within(rows[0]).getByRole("link", { name: longDate(-10) });
    expect(link).toHaveAttribute("href", "https://invoice.example/inv");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(rows[0]).toHaveTextContent("$68.00");
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "See more" }));
    rows = screen.getAllByTestId("schematic-invoice");
    expect(rows).toHaveLength(3);
    const credit = within(rows[2]).getByTitle("Credit applied to your account");
    expect(credit).toHaveTextContent("($15.00)");

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

  test("shows the status chip when asked", () => {
    renderInvoices(SCENARIOS.pro(), { showStatus: true, limit: 1 });
    expect(
      screen.getByRole("columnheader", { name: "Status" }),
    ).toBeInTheDocument();
    const row = screen.getByTestId("schematic-invoice");
    const chip = within(row).getByText("Paid");
    expect(chip).toHaveClass("schematic-chip");
    expect(chip).toHaveAttribute("data-status", "paid");
  });

  test("display toggles hide the header and columns", () => {
    renderInvoices(SCENARIOS.pro(), {
      showAmount: false,
      showDate: false,
      showHeader: false,
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("columnheader")).toBeNull();
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
    expect(note).toHaveTextContent("network down");
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

  test("labels the columns for sight and for assistive technology", () => {
    renderInvoices(SCENARIOS.pro(), { showStatus: true });
    const date = screen.getByRole("columnheader", { name: "Date" });
    expect(date.parentElement!.parentElement!.tagName).toBe("THEAD");
    expect(date).toHaveAttribute("scope", "col");
    // The column class carries the alignment, so a header and its cells
    // cannot disagree.
    expect(date).toHaveClass("schematic-invoices__date");
    expect(screen.getByRole("columnheader", { name: "Amount" })).toHaveClass(
      "schematic-invoices__amount",
    );
    expect(screen.getByRole("columnheader", { name: "Status" })).toHaveClass(
      "schematic-invoices__status",
    );
  });

  test("stays expanded when Load more takes the list past the limit", () => {
    // The first page can be under `limit`, so "Load more" shows while the
    // list is nominally collapsed. Appending must not fold it back up and
    // replace the button that was just clicked with "See more".
    const onLoadMoreInvoices = vi.fn();
    const page = (count: number, hasMore: boolean) => ({
      invoices: Array.from({ length: count }, () => invoice()),
      hasMore,
    });
    const view = render(
      <CompanyDataProvider
        data={{ invoices: page(12, true) }}
        onLoadMoreInvoices={onLoadMoreInvoices}
      >
        <Invoices limit={20} locale={L} />
      </CompanyDataProvider>,
    );
    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMoreInvoices).toHaveBeenCalled();

    view.rerender(
      <CompanyDataProvider
        data={{ invoices: page(24, false) }}
        onLoadMoreInvoices={onLoadMoreInvoices}
      >
        <Invoices limit={20} locale={L} />
      </CompanyDataProvider>,
    );
    expect(screen.getAllByTestId("schematic-invoice")).toHaveLength(24);
    expect(screen.queryByRole("button", { name: "See more" })).toBeNull();
  });

  test("shows a status it has no label for rather than an empty chip", () => {
    // InvoiceStatusFromJSON is an unchecked cast, so a status the API adds
    // reaches the element with no key of its own.
    renderInvoices(
      {
        invoices: invoicePage([
          invoice({ status: "disputed" as Invoice["status"] }),
        ]),
      },
      { showStatus: true },
    );
    const chip = screen.getByText("disputed");
    expect(chip).toHaveClass("schematic-chip");
    expect(chip).toHaveAttribute("data-status", "disputed");
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
