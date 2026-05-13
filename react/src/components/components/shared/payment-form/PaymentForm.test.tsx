import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, test, vi } from "vitest";

import { render } from "../../../test/setup";

import { PaymentForm } from "./PaymentForm";

const { mockUseEmbed, mockConfirmSetup, addressElementSpy } = vi.hoisted(
  () => ({
    mockUseEmbed: vi.fn(),
    mockConfirmSetup: vi.fn(),
    addressElementSpy: vi.fn(),
  }),
);

vi.mock("react-i18next", async (importOriginal) => ({
  ...(await importOriginal<typeof import("react-i18next")>()),
  useTranslation: () => ({ t: (key: string) => key }),
}));

vi.mock("../../../hooks", () => ({
  useEmbed: (...args: unknown[]) => mockUseEmbed(...args),
}));

vi.mock("@stripe/react-stripe-js", () => ({
  useStripe: () => ({ confirmSetup: mockConfirmSetup }),
  useElements: () => ({}),
  PaymentElement: () => <div data-testid="payment-element" />,
  AddressElement: (props: { options?: Record<string, unknown> }) => {
    addressElementSpy(props.options);
    return <div data-testid="address-element" />;
  },
}));

interface SetupOptions {
  collectEmail?: boolean;
  collectAddress?: boolean;
  collectPhone?: boolean;
  prefill?: { email?: string; name?: string };
}

function setupMocks({
  collectEmail = false,
  collectAddress = false,
  collectPhone = false,
  prefill,
}: SetupOptions = {}) {
  mockUseEmbed.mockReturnValue({
    data: {
      checkoutSettings: { collectEmail, collectAddress, collectPhone },
    },
    checkoutPrefill: prefill ? { billingDetails: prefill } : undefined,
  });
}

const getBillingDetails = () =>
  mockConfirmSetup.mock.calls[0][0].confirmParams.payment_method_data
    .billing_details;

describe("`PaymentForm` prefill", () => {
  beforeEach(() => {
    mockConfirmSetup.mockReset();
    mockConfirmSetup.mockResolvedValue({
      setupIntent: { payment_method: "pm_123" },
      error: undefined,
    });
    addressElementSpy.mockReset();
  });

  test("pre-fills the email input from host-provided prefill", () => {
    setupMocks({ collectEmail: true, prefill: { email: "a@b.com" } });

    render(<PaymentForm />);

    expect(screen.getByLabelText("Email")).toHaveValue("a@b.com");
  });

  test("passes the prefilled name to AddressElement defaultValues", () => {
    setupMocks({ collectAddress: true, prefill: { name: "Ada Lovelace" } });

    render(<PaymentForm />);

    const calls = addressElementSpy.mock.calls;
    const lastOptions = calls[calls.length - 1]?.[0];
    expect(lastOptions?.defaultValues).toEqual({ name: "Ada Lovelace" });
  });

  test("attaches prefilled email + name on submit when collected", async () => {
    setupMocks({
      collectEmail: true,
      collectAddress: true,
      prefill: { email: "a@b.com", name: "Ada Lovelace" },
    });

    render(<PaymentForm />);
    fireEvent.submit(document.getElementById("payment-form")!);

    await waitFor(() => expect(mockConfirmSetup).toHaveBeenCalled());
    expect(getBillingDetails()).toEqual({
      email: "a@b.com",
      name: "Ada Lovelace",
    });
  });

  test("does not attach email when collectEmail is disabled", async () => {
    setupMocks({ collectEmail: false, prefill: { email: "a@b.com" } });

    render(<PaymentForm />);
    fireEvent.submit(document.getElementById("payment-form")!);

    await waitFor(() => expect(mockConfirmSetup).toHaveBeenCalled());
    expect(getBillingDetails()).toEqual({});
  });

  test("does not attach name when billing address is not collected", async () => {
    setupMocks({
      collectEmail: true,
      collectAddress: false,
      collectPhone: false,
      prefill: { email: "a@b.com", name: "Ada Lovelace" },
    });

    render(<PaymentForm />);
    fireEvent.submit(document.getElementById("payment-form")!);

    await waitFor(() => expect(mockConfirmSetup).toHaveBeenCalled());
    expect(getBillingDetails()).toEqual({ email: "a@b.com" });
  });

  test("syncs a late-arriving prefill email but never clobbers user input", () => {
    setupMocks({ collectEmail: true });

    const { rerender } = render(<PaymentForm />);
    expect(screen.getByLabelText("Email")).toHaveValue("");

    // Prefill arrives after mount -> input updates.
    setupMocks({ collectEmail: true, prefill: { email: "a@b.com" } });
    rerender(<PaymentForm />);
    expect(screen.getByLabelText("Email")).toHaveValue("a@b.com");

    // User edits the field.
    fireEvent.change(screen.getByLabelText("Email"), {
      target: { value: "typed@me.com" },
    });
    expect(screen.getByLabelText("Email")).toHaveValue("typed@me.com");

    // A later prefill change must not overwrite the user's input.
    setupMocks({ collectEmail: true, prefill: { email: "other@b.com" } });
    rerender(<PaymentForm />);
    expect(screen.getByLabelText("Email")).toHaveValue("typed@me.com");
  });
});
