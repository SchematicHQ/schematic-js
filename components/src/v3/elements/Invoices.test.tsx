import {
  CatalogDataProvider,
  type CatalogData,
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
  data: CatalogData = SCENARIOS.pro(),
  props: InvoicesProps = {},
  handlers: {
    onLoadMoreInvoices?: () => void;
    status?: React.ComponentProps<typeof CatalogDataProvider>["status"];
  } = {},
) {
  return render(
    <CatalogDataProvider
      data={data}
      status={handlers.status}
      onLoadMoreInvoices={handlers.onLoadMoreInvoices}
    >
      <Invoices locale={L} {...props} />
    </CatalogDataProvider>,
  );
}

describe("Invoices", () => {
  test("renders a skeleton while the invoices load", () => {
    renderInvoices({});
    expect(screen.getByLabelText("Loading invoices")).toBeInTheDocument();
  });

  test("renders an error with retry, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    render(
      <CatalogDataProvider
        data={{}}
        status={{ invoices: { error: new Error("Boom") } }}
        onRefetch={onRefetch}
      >
        <Invoices />
      </CatalogDataProvider>,
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
    renderInvoices(SCENARIOS.pro(), {}, { onLoadMoreInvoices });
    expect(
      screen.getByRole("columnheader", { name: "Date" }),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("columnheader", { name: "Amount" }),
    ).toBeInTheDocument();
    expect(screen.queryByRole("columnheader", { name: "Status" })).toBeNull();

    let rows = screen.getAllByTestId("sch-invoice");
    expect(rows).toHaveLength(2);
    const link = within(rows[0]).getByRole("link", { name: longDate(-10) });
    expect(link).toHaveAttribute("href", "https://invoice.example/inv");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(rows[0]).toHaveTextContent("$68.00");
    expect(screen.queryByRole("button", { name: "Load more" })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "See more" }));
    rows = screen.getAllByTestId("sch-invoice");
    expect(rows).toHaveLength(3);
    const credit = within(rows[2]).getByTitle("Credit applied to your account");
    expect(credit).toHaveTextContent("($15.00)");

    fireEvent.click(screen.getByRole("button", { name: "Load more" }));
    expect(onLoadMoreInvoices).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole("button", { name: "See less" }));
    expect(screen.getAllByTestId("sch-invoice")).toHaveLength(2);
  });

  test("renders every row and Load more when not collapsible", () => {
    renderInvoices(SCENARIOS.pro(), { collapsible: false });
    expect(screen.getAllByTestId("sch-invoice")).toHaveLength(3);
    expect(screen.queryByRole("button", { name: "See more" })).toBeNull();
    expect(
      screen.getByRole("button", { name: "Load more" }),
    ).toBeInTheDocument();
  });

  test("hides Load more when the history is complete", () => {
    const data = SCENARIOS.pro();
    data.invoices = invoicePage(data.invoices!.invoices, false);
    renderInvoices(data, { limit: 5 });
    expect(screen.getAllByTestId("sch-invoice")).toHaveLength(3);
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("falls back to the created date and plain text without a URL", () => {
    const data = SCENARIOS.pro();
    data.invoices = invoicePage([
      invoice({ dueDate: null, createdAt: daysFromNow(-1), url: null }),
    ]);
    renderInvoices(data);
    const row = screen.getByTestId("sch-invoice");
    expect(within(row).queryByRole("link")).toBeNull();
    expect(row).toHaveTextContent(longDate(-1));
  });

  test("shows the status chip when asked", () => {
    renderInvoices(SCENARIOS.pro(), { showStatus: true, limit: 1 });
    expect(
      screen.getByRole("columnheader", { name: "Status" }),
    ).toBeInTheDocument();
    const row = screen.getByTestId("sch-invoice");
    expect(within(row).getByText("paid")).toHaveClass("schematic-chip");
  });

  test("display toggles hide the header and columns", () => {
    renderInvoices(SCENARIOS.pro(), {
      headerText: "Billing history",
      showAmount: false,
      showDate: false,
      showHeader: false,
    });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByRole("columnheader")).toBeNull();
    expect(screen.queryByText("$68.00")).toBeNull();
  });

  test("uses the custom header text", () => {
    renderInvoices(SCENARIOS.pro(), { headerText: "Billing history" });
    expect(
      screen.getByRole("heading", { name: "Billing history" }),
    ).toBeInTheDocument();
  });
});
