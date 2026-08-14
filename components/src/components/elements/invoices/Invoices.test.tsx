import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { InvoiceStatus } from "../../../api/checkoutexternal";
import { MAX_VISIBLE_INVOICE_COUNT } from "../../../const";
import { defaultSettings } from "../../../context";
import { render } from "../../../test/setup";

import { Invoices } from "./Invoices";

const state = vi.hoisted(() => ({
  invoices: [] as unknown[],
}));

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();

  // `getInvoices` is a useCallback keyed on `listInvoices`, and another effect
  // is keyed on `data`. Both identities have to be stable across renders or
  // the component re-fetches itself into an update loop.
  const data = {};
  const listInvoices = () => Promise.resolve({ data: state.invoices });

  return {
    ...actual,
    useEmbed: () => ({ data, settings: defaultSettings, listInvoices }),
  };
});

// Paid and already due, so `formatInvoices` keeps every one of them. Amounts
// ascend with the index and dates descend, so the rendered order is the
// newest-first order `formatInvoices` sorts into.
const invoicesFor = (count: number) =>
  Array.from({ length: count }, (_, index) => ({
    amountDue: (index + 1) * 100,
    dueDate: new Date(2026, 0, count - index),
    createdAt: new Date(2026, 0, count - index),
    status: InvoiceStatus.Paid,
    currency: "usd",
    url: null,
  }));

const invoiceRows = () => screen.queryAllByText(/^\$\d/);

const DEFAULT_LIMIT = 2;

beforeEach(() => {
  state.invoices = [];
});

describe("`Invoices` truncation", () => {
  test("caps the list at the configured limit", async () => {
    state.invoices = invoicesFor(5);

    render(<Invoices />);

    await waitFor(() => expect(invoiceRows()).toHaveLength(DEFAULT_LIMIT));
    expect(screen.getByText("See more")).toBeInTheDocument();
  });

  test("expands to the full list and collapses back", async () => {
    state.invoices = invoicesFor(5);

    render(<Invoices />);

    await waitFor(() => expect(screen.getByText("See more")).toBeVisible());

    fireEvent.click(screen.getByText("See more"));
    expect(invoiceRows()).toHaveLength(5);

    fireEvent.click(screen.getByText("See less"));
    expect(invoiceRows()).toHaveLength(DEFAULT_LIMIT);
  });

  test("expanding reveals no more than the hard invoice cap", async () => {
    state.invoices = invoicesFor(MAX_VISIBLE_INVOICE_COUNT + 5);

    render(<Invoices />);

    await waitFor(() => expect(screen.getByText("See more")).toBeVisible());

    fireEvent.click(screen.getByText("See more"));
    expect(invoiceRows()).toHaveLength(MAX_VISIBLE_INVOICE_COUNT);
  });

  test("renders no toggle when the list is at the limit", async () => {
    state.invoices = invoicesFor(DEFAULT_LIMIT);

    render(<Invoices />);

    await waitFor(() => expect(invoiceRows()).toHaveLength(DEFAULT_LIMIT));
    expect(screen.queryByText("See more")).not.toBeInTheDocument();
  });

  test("honors a caller-supplied limit", async () => {
    state.invoices = invoicesFor(5);

    render(<Invoices limit={{ number: 4 }} />);

    await waitFor(() => expect(invoiceRows()).toHaveLength(4));
    expect(screen.getByText("See more")).toBeInTheDocument();
  });
});
