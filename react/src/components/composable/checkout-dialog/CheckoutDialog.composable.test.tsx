import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import {
  CheckoutDialog,
  CheckoutDialogContext,
  type CheckoutDialogContextValue,
} from ".";

function withContext(
  ui: React.ReactNode,
  overrides: Partial<CheckoutDialogContextValue> = {},
) {
  const value: CheckoutDialogContextValue = {
    isOpen: true,
    close: vi.fn(),
    ...overrides,
  };
  return { value, ...render(
    <CheckoutDialogContext.Provider value={value}>
      {ui}
    </CheckoutDialogContext.Provider>,
  ) };
}

describe("CheckoutDialog primitives", () => {
  test("Close invokes close on click", () => {
    const close = vi.fn();
    withContext(<CheckoutDialog.Close>Close</CheckoutDialog.Close>, { close });

    fireEvent.click(screen.getByText("Close"));
    expect(close).toHaveBeenCalledTimes(1);
  });

  test("Close supports asChild and emits the part attribute", () => {
    withContext(
      <CheckoutDialog.Close asChild>
        <a href="/x">Close</a>
      </CheckoutDialog.Close>,
    );
    expect(screen.getByRole("link", { name: "Close" })).toHaveAttribute(
      "data-schematic-part",
      "checkout-dialog-close",
    );
  });

  test("useCheckoutDialog throws outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<CheckoutDialog.Close>x</CheckoutDialog.Close>),
    ).toThrow(/must be rendered inside/);
    spy.mockRestore();
  });
});
