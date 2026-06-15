import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import { type PaymentMethodResponseData } from "../../api/checkoutexternal";

import {
  PaymentMethod,
  PaymentMethodContext,
  type PaymentMethodContextValue,
} from ".";

const cardPaymentMethod = {
  id: "pm-1",
  paymentMethodType: "card",
  cardBrand: "visa",
  cardLast4: "4242",
} as PaymentMethodResponseData;

function paymentMethodContext(
  overrides: Partial<PaymentMethodContextValue> = {},
): PaymentMethodContextValue {
  return {
    paymentMethod: cardPaymentMethod,
    monthsToExpiration: undefined,
    customCheckoutFields: undefined,
    isExpiringSoon: false,
    hasPaymentMethod: true,
    onEdit: vi.fn(),
    ...overrides,
  };
}

function renderWithContext(
  ui: React.ReactNode,
  overrides?: Partial<PaymentMethodContextValue>,
) {
  return render(
    <PaymentMethodContext.Provider value={paymentMethodContext(overrides)}>
      {ui}
    </PaymentMethodContext.Provider>,
  );
}

describe("PaymentMethod primitives", () => {
  test("Label exposes the resolved display data", () => {
    renderWithContext(
      <PaymentMethod.Label>
        {({ data, hasPaymentMethod }) => (
          <span>
            {hasPaymentMethod ? `${data?.label} ${data?.paymentLast4}` : "none"}
          </span>
        )}
      </PaymentMethod.Label>,
    );

    expect(screen.getByText("Card ending in 4242")).toBeInTheDocument();
  });

  test("Empty renders only when there is no payment method", () => {
    const { rerender } = renderWithContext(
      <PaymentMethod.Empty>No payment method</PaymentMethod.Empty>,
    );
    expect(screen.queryByText("No payment method")).not.toBeInTheDocument();

    rerender(
      <PaymentMethodContext.Provider
        value={paymentMethodContext({
          paymentMethod: undefined,
          hasPaymentMethod: false,
        })}
      >
        <PaymentMethod.Empty>No payment method</PaymentMethod.Empty>
      </PaymentMethodContext.Provider>,
    );
    expect(screen.getByText("No payment method")).toBeInTheDocument();
  });

  test("Expiration gates on isExpiringSoon and exposes months", () => {
    const { rerender } = renderWithContext(
      <PaymentMethod.Expiration>
        {({ monthsToExpiration }) => <span>{monthsToExpiration} months</span>}
      </PaymentMethod.Expiration>,
    );
    expect(screen.queryByText(/months/)).not.toBeInTheDocument();

    rerender(
      <PaymentMethodContext.Provider
        value={paymentMethodContext({
          isExpiringSoon: true,
          monthsToExpiration: 2,
        })}
      >
        <PaymentMethod.Expiration>
          {({ monthsToExpiration }) => <span>{monthsToExpiration} months</span>}
        </PaymentMethod.Expiration>
      </PaymentMethodContext.Provider>,
    );
    expect(screen.getByText("2 months")).toBeInTheDocument();
  });

  test("EditTrigger invokes onEdit and hides when editing disabled", () => {
    const onEdit = vi.fn();
    const { rerender } = renderWithContext(
      <PaymentMethod.EditTrigger>Edit</PaymentMethod.EditTrigger>,
      { onEdit },
    );

    fireEvent.click(screen.getByText("Edit"));
    expect(onEdit).toHaveBeenCalledTimes(1);

    rerender(
      <PaymentMethodContext.Provider
        value={paymentMethodContext({ onEdit: undefined })}
      >
        <PaymentMethod.EditTrigger>Edit</PaymentMethod.EditTrigger>
      </PaymentMethodContext.Provider>,
    );
    expect(screen.queryByText("Edit")).not.toBeInTheDocument();
  });

  test("usePaymentMethod throws outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(
        <PaymentMethod.Label>{() => null}</PaymentMethod.Label>,
      ),
    ).toThrow(/must be rendered inside/);
    spy.mockRestore();
  });
});
