import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { type InvoiceResponseData } from "../../api/checkoutexternal";

import {
  UpcomingBill,
  UpcomingBillContext,
  type UpcomingBillContextValue,
} from ".";

const invoice = {
  amountDue: 4200,
  currency: "usd",
} as InvoiceResponseData;

function withContext(
  ui: React.ReactNode,
  overrides: Partial<UpcomingBillContextValue> = {},
) {
  const value: UpcomingBillContextValue = {
    isVisible: true,
    isLoading: false,
    error: undefined,
    upcomingInvoice: invoice,
    balances: [],
    discounts: [],
    retry: vi.fn(),
    ...overrides,
  };
  return render(
    <UpcomingBillContext.Provider value={value}>
      {ui}
    </UpcomingBillContext.Provider>,
  );
}

describe("UpcomingBill primitives", () => {
  test("Content exposes the invoice once loaded", () => {
    withContext(
      <UpcomingBill.Content>
        {({ upcomingInvoice }) => (
          <span>{upcomingInvoice?.amountDue ?? "none"}</span>
        )}
      </UpcomingBill.Content>,
    );
    expect(screen.getByText("4200")).toBeInTheDocument();
  });

  test("Loading gates on isLoading; Content hidden while loading", () => {
    withContext(
      <>
        <UpcomingBill.Loading>loading…</UpcomingBill.Loading>
        <UpcomingBill.Content>{() => <span>ready</span>}</UpcomingBill.Content>
      </>,
      { isLoading: true },
    );
    expect(screen.getByText("loading…")).toBeInTheDocument();
    expect(screen.queryByText("ready")).not.toBeInTheDocument();
  });

  test("ErrorState exposes retry and hides Content on error", () => {
    const retry = vi.fn();
    withContext(
      <>
        <UpcomingBill.ErrorState>
          {({ retry }) => <button onClick={retry}>retry</button>}
        </UpcomingBill.ErrorState>
        <UpcomingBill.Content>{() => <span>ready</span>}</UpcomingBill.Content>
      </>,
      { error: new Error("boom"), retry },
    );

    expect(screen.queryByText("ready")).not.toBeInTheDocument();
    fireEvent.click(screen.getByText("retry"));
    expect(retry).toHaveBeenCalledTimes(1);
  });
});
