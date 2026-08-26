import { waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

// Initializes the shared i18next instance the component reads its locale from.
import "../../../localization";
import { render } from "../../../test/setup";

import { PaymentMethodDetails } from "./PaymentMethodDetails";

const { elementsSpy, mockUseEmbed } = vi.hoisted(() => ({
  elementsSpy: vi.fn(),
  mockUseEmbed: vi.fn(),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  Elements: ({
    options,
    children,
  }: {
    options?: Record<string, unknown>;
    children?: React.ReactNode;
  }) => {
    elementsSpy(options);
    return <div data-testid="elements">{children}</div>;
  },
}));

vi.mock("../../../hooks", () => ({
  useEmbed: (...args: unknown[]) => mockUseEmbed(...args),
  useIsLightBackground: () => true,
  usePaymentConfirmation: () => ({ isConfirming: false }),
}));

vi.mock("../../shared", () => ({
  PaymentForm: () => <div data-testid="payment-form" />,
}));

const setBrowserLanguage = (language: string) => {
  Object.defineProperty(window.navigator, "language", {
    value: language,
    configurable: true,
  });
  Object.defineProperty(window.navigator, "languages", {
    value: [language],
    configurable: true,
  });
};

describe("`PaymentMethodDetails` Stripe locale", () => {
  beforeEach(() => {
    elementsSpy.mockReset();
    mockUseEmbed.mockReturnValue({
      data: { company: { paymentMethods: [] } },
      settings: {
        theme: {
          primary: "#000000",
          typography: { text: { color: "#000000" } },
        },
      },
      createSetupIntent: vi.fn().mockResolvedValue({
        data: {
          setupIntentClientSecret: "seti_123_secret_456",
          publishableKey: "pk_test_123",
        },
      }),
      updatePaymentMethod: vi.fn(),
      deletePaymentMethod: vi.fn(),
    });
  });

  test("pins the payment form to the embed's language, not the browser's", async () => {
    setBrowserLanguage("it-IT");

    render(<PaymentMethodDetails />);

    await waitFor(() => expect(elementsSpy).toHaveBeenCalled());

    const calls = elementsSpy.mock.calls;
    const options = calls[calls.length - 1]?.[0];
    expect(options?.locale).toBe("en");
  });
});
