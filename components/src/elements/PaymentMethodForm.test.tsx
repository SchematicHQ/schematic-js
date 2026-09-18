import {
  BillingDataProvider,
  type BillingActions,
  type SetupIntent,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { PaymentMethodForm } from "./PaymentMethodForm";
import { defaultString } from "./strings";

/**
 * Stripe is faked at the package boundary: `loadStripe` answers with a
 * stand-in, and `@stripe/react-stripe-js` renders plain nodes and hands the
 * form a `confirmSetup` it can drive.
 */
const stripe = vi.hoisted(() => ({
  confirmSetup: vi.fn(),
  elements: { kind: "elements" },
  elementsProps: vi.fn(),
  instance: { kind: "stripe" },
  loadStripe: vi.fn(),
}));

vi.mock("@stripe/stripe-js", () => ({ loadStripe: stripe.loadStripe }));
vi.mock("@stripe/react-stripe-js", () => ({
  Elements: (props: {
    children: React.ReactNode;
    options: unknown;
    stripe: unknown;
  }) => {
    stripe.elementsProps({ options: props.options, stripe: props.stripe });
    return <div data-testid="elements">{props.children}</div>;
  },
  PaymentElement: () => <div data-testid="payment-element" />,
  useElements: () => stripe.elements,
  useStripe: () => ({ confirmSetup: stripe.confirmSetup }),
}));

const L = "en-US";

function intent(overrides: Partial<SetupIntent> = {}): SetupIntent {
  return {
    publishableKey: "pk_account",
    schematicPublishableKey: "pk_schematic",
    setupIntentClientSecret: "seti_secret",
    ...overrides,
  };
}

function renderForm(actions: Partial<BillingActions>, locale = L) {
  const onClose = vi.fn();
  const onSaved = vi.fn().mockResolvedValue(undefined);
  render(
    <BillingDataProvider actions={actions} data={{}}>
      <PaymentMethodForm
        locale={locale}
        t={defaultString}
        onClose={onClose}
        onSaved={onSaved}
      />
    </BillingDataProvider>,
  );
  return { onClose, onSaved };
}

/** A form that has minted its intent and loaded Stripe. */
async function renderReady(overrides: Partial<SetupIntent> = {}) {
  stripe.loadStripe.mockResolvedValue(stripe.instance);
  const handlers = renderForm({
    createSetupIntent: vi.fn().mockResolvedValue(intent(overrides)),
  });
  await screen.findByRole("button", { name: "Save" });
  return handlers;
}

describe("PaymentMethodForm", () => {
  beforeEach(() => {
    stripe.confirmSetup.mockReset();
    stripe.elementsProps.mockReset();
    stripe.loadStripe.mockReset();
  });

  test("holds a place while the intent and Stripe load", () => {
    renderForm({ createSetupIntent: () => new Promise(() => {}) });
    const pending = screen
      .getByText("Loading payment form")
      .closest("[data-state]");
    expect(pending).toHaveAttribute("data-state", "pending");
    expect(pending).toHaveClass("schematic-payment-methods__form");
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
  });

  test("loads Stripe with the account's key and mounts the element on the intent", async () => {
    await renderReady();
    expect(stripe.loadStripe).toHaveBeenCalledWith("pk_account", {
      locale: L,
    });
    expect(stripe.elementsProps).toHaveBeenCalledWith({
      options: { clientSecret: "seti_secret" },
      stripe: stripe.instance,
    });
    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Cancel" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("a connected account loads through Schematic's key, naming the account", async () => {
    await renderReady({ accountId: "acct_123" });
    expect(stripe.loadStripe).toHaveBeenCalledWith("pk_schematic", {
      locale: L,
      stripeAccount: "acct_123",
    });
  });

  test("falls back to Schematic's key when the intent names none", async () => {
    await renderReady({ publishableKey: undefined });
    expect(stripe.loadStripe).toHaveBeenCalledWith("pk_schematic", {
      locale: L,
    });
  });

  test("passes the locale on to Stripe", async () => {
    stripe.loadStripe.mockResolvedValue(stripe.instance);
    renderForm(
      { createSetupIntent: vi.fn().mockResolvedValue(intent()) },
      "de-DE",
    );
    await screen.findByRole("button", { name: "Save" });
    expect(stripe.loadStripe).toHaveBeenCalledWith("pk_account", {
      locale: "de-DE",
    });
  });

  test("an intent with no client secret is an error, not a crash", async () => {
    stripe.loadStripe.mockResolvedValue(stripe.instance);
    renderForm({
      createSetupIntent: vi
        .fn()
        .mockResolvedValue(intent({ setupIntentClientSecret: undefined })),
    });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load payment methods",
    );
    expect(screen.queryByRole("button", { name: "Save" })).toBeNull();
    expect(stripe.loadStripe).not.toHaveBeenCalled();
  });

  test("Stripe failing to load is an error, not a crash", async () => {
    stripe.loadStripe.mockResolvedValue(null);
    renderForm({ createSetupIntent: vi.fn().mockResolvedValue(intent()) });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not load payment methods",
    );
  });

  test("a refused intent is an error, with Cancel as the way out", async () => {
    const { onClose } = renderForm({
      createSetupIntent: vi.fn().mockRejectedValue(new Error("403")),
    });
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent("Could not load payment methods");
    expect(alert).not.toHaveTextContent("403");
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  test("Save confirms the setup in place and hands back the method", async () => {
    stripe.confirmSetup.mockResolvedValue({
      setupIntent: { payment_method: "pm_new" },
    });
    const { onSaved } = await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("pm_new"));
    expect(stripe.confirmSetup).toHaveBeenCalledWith(
      expect.objectContaining({
        elements: stripe.elements,
        redirect: "if_required",
      }),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("reads the method's id when Stripe expands it", async () => {
    stripe.confirmSetup.mockResolvedValue({
      setupIntent: { payment_method: { id: "pm_expanded" } },
    });
    const { onSaved } = await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("pm_expanded"));
  });

  test("shows Stripe's own message when it declines", async () => {
    stripe.confirmSetup.mockResolvedValue({
      error: { type: "card_error", message: "Your card was declined." },
    });
    const { onClose, onSaved } = await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your card was declined.",
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
    expect(screen.getByRole("button", { name: "Save" })).toBeEnabled();
  });

  test("a confirmation that throws reads as a failed save", async () => {
    stripe.confirmSetup.mockRejectedValue(new Error("network"));
    const { onSaved } = await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save the payment method",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("a confirmation with no method behind it reads as a failed save", async () => {
    stripe.confirmSetup.mockResolvedValue({
      setupIntent: { payment_method: null },
    });
    const { onSaved } = await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Save" }));
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Could not save the payment method",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("Cancel closes without confirming anything", async () => {
    const { onClose, onSaved } = await renderReady();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(stripe.confirmSetup).not.toHaveBeenCalled();
    expect(onSaved).not.toHaveBeenCalled();
  });
});
