import { fireEvent, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";

import { InvoiceStatus } from "../../../api/checkoutexternal";
import { MAX_VISIBLE_INVOICE_COUNT } from "../../../const";
import { defaultSettings } from "../../../context";
import { render } from "../../../test/setup";

import { Invoices } from "./Invoices";

const state = vi.hoisted(() => ({
  invoices: [] as unknown[],
  getInvoiceLink: vi.fn(),
}));

vi.mock("../../../hooks", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../../../hooks")>();

  // `getInvoices` is a useCallback keyed on `listInvoices`, and another effect
  // is keyed on `data`. Both identities have to be stable across renders or
  // the component re-fetches itself into an update loop.
  const data = {};
  const listInvoices = () => Promise.resolve({ data: state.invoices });
  const getInvoiceLink = (id: string) => state.getInvoiceLink(id);

  return {
    ...actual,
    useEmbed: () => ({
      data,
      settings: defaultSettings,
      listInvoices,
      getInvoiceLink,
    }),
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
  state.getInvoiceLink.mockReset();
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

describe("`Invoices` links", () => {
  const STORED_URL = "https://invoice.stripe.com/i/stored";
  const FRESH_URL = "https://invoice.stripe.com/i/fresh";

  beforeEach(() => {
    state.invoices = [
      {
        ...invoicesFor(1)[0],
        id: "bilin_1",
        url: STORED_URL,
      },
    ];
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  function stubWindowOpen(tab: unknown) {
    return vi.spyOn(window, "open").mockReturnValue(tab as Window);
  }

  async function findLink() {
    return screen.findByRole("link");
  }

  test("keeps the stored URL as the link's href", async () => {
    render(<Invoices />);

    const link = await findLink();
    expect(link).toHaveAttribute("href", STORED_URL);
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
  });

  test("opens the fresh URL on success", async () => {
    const tab = { opener: window, location: { href: "" } };
    const open = stubWindowOpen(tab);
    state.getInvoiceLink.mockResolvedValue({
      data: { id: "bilin_1", url: FRESH_URL },
    });
    render(<Invoices />);

    const notPrevented = fireEvent.click(await findLink());

    expect(notPrevented).toBe(false);
    expect(open).toHaveBeenCalledWith("", "_blank");
    expect(tab.opener).toBeNull();
    expect(state.getInvoiceLink).toHaveBeenCalledWith("bilin_1");
    await waitFor(() => expect(tab.location.href).toBe(FRESH_URL));
  });

  test("falls back to the stored URL when the request fails", async () => {
    const tab = { opener: window, location: { href: "" } };
    stubWindowOpen(tab);
    state.getInvoiceLink.mockRejectedValue(new Error("not found"));
    render(<Invoices />);

    fireEvent.click(await findLink());

    await waitFor(() => expect(tab.location.href).toBe(STORED_URL));
  });

  test("opens the window before the request resolves", async () => {
    const tab = { opener: window, location: { href: "" } };
    const open = stubWindowOpen(tab);
    let resolve: (value: unknown) => void = () => {};
    state.getInvoiceLink.mockReturnValue(
      new Promise((r) => {
        resolve = r;
      }),
    );
    render(<Invoices />);

    fireEvent.click(await findLink());

    expect(open).toHaveBeenCalledTimes(1);
    expect(open.mock.invocationCallOrder[0]).toBeLessThan(
      state.getInvoiceLink.mock.invocationCallOrder[0],
    );
    expect(tab.location.href).toBe("");

    resolve({ data: { id: "bilin_1", url: FRESH_URL } });
    await waitFor(() => expect(tab.location.href).toBe(FRESH_URL));
  });

  test("follows the stored href when the window is blocked", async () => {
    stubWindowOpen(null);
    render(<Invoices />);

    const notPrevented = fireEvent.click(await findLink());

    expect(notPrevented).toBe(true);
    expect(state.getInvoiceLink).not.toHaveBeenCalled();
  });

  test("leaves a modified click to the browser", async () => {
    const open = stubWindowOpen({ opener: window, location: { href: "" } });
    render(<Invoices />);

    const notPrevented = fireEvent.click(await findLink(), { metaKey: true });

    expect(notPrevented).toBe(true);
    expect(open).not.toHaveBeenCalled();
    expect(state.getInvoiceLink).not.toHaveBeenCalled();
  });
});
