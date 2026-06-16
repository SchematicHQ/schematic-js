import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import {
  Invoices,
  InvoicesContext,
  type FormattedInvoice,
  type InvoicesContextValue,
} from ".";

const sampleInvoices: FormattedInvoice[] = [
  { amount: "$10.00", amountDue: 1000, date: "Jan 1, 2026", url: "/a" },
  { amount: "$20.00", amountDue: 2000, date: "Feb 1, 2026" },
  { amount: "$30.00", amountDue: 3000, date: "Mar 1, 2026" },
];

function withContext(
  ui: React.ReactNode,
  overrides: Partial<InvoicesContextValue> = {},
) {
  const value: InvoicesContextValue = {
    invoices: sampleInvoices,
    visibleInvoices: sampleInvoices.slice(0, 2),
    isLoading: false,
    error: undefined,
    retry: vi.fn(),
    hasMore: true,
    expanded: false,
    toggle: vi.fn(),
    isEmpty: false,
    ...overrides,
  };
  return render(
    <InvoicesContext.Provider value={value}>{ui}</InvoicesContext.Provider>,
  );
}

describe("Invoices primitives", () => {
  test("List exposes visible invoices and renders only when ready", () => {
    withContext(
      <Invoices.List>
        {({ visibleInvoices }) => (
          <ul>
            {visibleInvoices.map((inv) => (
              <li key={inv.date}>{inv.amount}</li>
            ))}
          </ul>
        )}
      </Invoices.List>,
    );

    expect(screen.getByText("$10.00")).toBeInTheDocument();
    expect(screen.getByText("$20.00")).toBeInTheDocument();
    expect(screen.queryByText("$30.00")).not.toBeInTheDocument();
  });

  test("List renders nothing while loading", () => {
    withContext(
      <Invoices.List>{() => <span>list</span>}</Invoices.List>,
      { isLoading: true },
    );
    expect(screen.queryByText("list")).not.toBeInTheDocument();
  });

  test("ToggleMore exposes toggle and gates on hasMore", () => {
    const toggle = vi.fn();
    const { rerender } = withContext(
      <Invoices.ToggleMore>
        {({ expanded, toggle }) => (
          <button onClick={toggle}>{expanded ? "less" : "more"}</button>
        )}
      </Invoices.ToggleMore>,
      { toggle },
    );

    fireEvent.click(screen.getByText("more"));
    expect(toggle).toHaveBeenCalledTimes(1);

    rerender(
      <InvoicesContext.Provider
        value={{
          invoices: sampleInvoices,
          visibleInvoices: sampleInvoices,
          isLoading: false,
          error: undefined,
          retry: vi.fn(),
          hasMore: false,
          expanded: true,
          toggle,
          isEmpty: false,
        }}
      >
        <Invoices.ToggleMore>{() => <span>toggle</span>}</Invoices.ToggleMore>
      </InvoicesContext.Provider>,
    );
    expect(screen.queryByText("toggle")).not.toBeInTheDocument();
  });

  test("ErrorState exposes retry", () => {
    const retry = vi.fn();
    withContext(
      <Invoices.ErrorState>
        {({ retry }) => <button onClick={retry}>retry</button>}
      </Invoices.ErrorState>,
      { error: new Error("boom"), retry },
    );

    fireEvent.click(screen.getByText("retry"));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
