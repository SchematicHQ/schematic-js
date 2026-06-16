import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";

import {
  UnsubscribeButton,
  UnsubscribeButtonContext,
  type UnsubscribeButtonContextValue,
} from ".";

function withContext(
  ui: React.ReactNode,
  overrides: Partial<UnsubscribeButtonContextValue> = {},
) {
  const value: UnsubscribeButtonContextValue = {
    hasActiveSubscription: true,
    unsubscribe: vi.fn(),
    ...overrides,
  };
  return {
    value,
    ...render(
      <UnsubscribeButtonContext.Provider value={value}>
        {ui}
      </UnsubscribeButtonContext.Provider>,
    ),
  };
}

describe("UnsubscribeButton primitives", () => {
  test("Trigger invokes unsubscribe on click", () => {
    const unsubscribe = vi.fn();
    withContext(
      <UnsubscribeButton.Trigger>Cancel</UnsubscribeButton.Trigger>,
      { unsubscribe },
    );

    fireEvent.click(screen.getByText("Cancel"));
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  test("Trigger supports asChild and emits the part attribute", () => {
    withContext(
      <UnsubscribeButton.Trigger asChild>
        <a href="/x">Cancel</a>
      </UnsubscribeButton.Trigger>,
    );

    const link = screen.getByRole("link", { name: "Cancel" });
    expect(link).toHaveAttribute(
      "data-schematic-part",
      "unsubscribe-trigger",
    );
  });

  test("useUnsubscribeButton throws outside Root", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() =>
      render(<UnsubscribeButton.Trigger>x</UnsubscribeButton.Trigger>),
    ).toThrow(/must be rendered inside/);
    spy.mockRestore();
  });
});
