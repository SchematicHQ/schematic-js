import {
  BillingDataProvider,
  type BillingActions,
  type SetupIntent,
} from "@schematichq/schematic-react";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { vi } from "vitest";

import {
  PaymentMethodForm,
  resolveAppearance,
  type PaymentMethodFormProps,
} from "./PaymentMethodForm";
import { defaultString } from "./strings";

/**
 * Stripe is faked at the package boundary: `loadStripe` answers with a
 * stand-in, and `@stripe/react-stripe-js` renders plain nodes and hands the
 * form a `confirmSetup` it can drive. The fake `PaymentElement` reports
 * itself ready and its fields complete on mount unless `fields` says
 * otherwise.
 */
const stripe = vi.hoisted(() => ({
  confirmSetup: vi.fn(),
  elements: { kind: "elements" },
  elementsProps: vi.fn(),
  addressProps: vi.fn(),
  addressComplete: false,
  instance: { kind: "stripe" },
  loadStripe: vi.fn(),
  fields: "complete" as "complete" | "incomplete" | "loadError" | "silent",
}));

vi.mock("@stripe/stripe-js", () => ({ loadStripe: stripe.loadStripe }));
vi.mock("@stripe/react-stripe-js", async () => {
  const { useEffect } = await import("react");
  return {
    Elements: (props: {
      children: React.ReactNode;
      options: unknown;
      stripe: unknown;
    }) => {
      stripe.elementsProps({ options: props.options, stripe: props.stripe });
      return <div data-testid="elements">{props.children}</div>;
    },
    PaymentElement: (props: {
      onChange: (event: { complete: boolean }) => void;
      onLoadError: () => void;
      onReady: () => void;
    }) => {
      useEffect(() => {
        if (stripe.fields === "loadError") {
          props.onLoadError();
        } else if (stripe.fields !== "silent") {
          props.onReady();
          props.onChange({ complete: stripe.fields === "complete" });
        }
        // Once, on mount, as Stripe reports.
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);
      return <div data-testid="payment-element" />;
    },
    AddressElement: (props: {
      onChange: (event: { complete: boolean }) => void;
      options: unknown;
    }) => {
      stripe.addressProps(props.options);
      return (
        <button
          data-testid="address-element"
          type="button"
          onClick={() => props.onChange({ complete: stripe.addressComplete })}
        >
          fake address
        </button>
      );
    },
    useElements: () => stripe.elements,
    useStripe: () => ({ confirmSetup: stripe.confirmSetup }),
  };
});

const L = "en-US";

function intent(overrides: Partial<SetupIntent> = {}): SetupIntent {
  return {
    publishableKey: "pk_account",
    schematicPublishableKey: "pk_schematic",
    setupIntentClientSecret: "seti_secret",
    ...overrides,
  };
}

function renderForm(
  actions: Partial<BillingActions>,
  locale = L,
  onSelectExisting?: () => void,
  checkout: Pick<
    PaymentMethodFormProps,
    "checkoutPrefill" | "checkoutSettings"
  > = {},
) {
  const onSaved = vi.fn().mockResolvedValue(undefined);
  render(
    <BillingDataProvider actions={actions} data={{}}>
      <PaymentMethodForm
        {...checkout}
        locale={locale}
        t={defaultString}
        onSaved={onSaved}
        onSelectExisting={onSelectExisting}
      />
    </BillingDataProvider>,
  );
  return { onSaved };
}

/** A form over a minted intent and a loaded Stripe, not yet waited on. */
function renderStripe(
  checkout: Parameters<typeof renderForm>[3] = {},
  overrides: Partial<SetupIntent> = {},
  onSelectExisting?: () => void,
) {
  stripe.loadStripe.mockResolvedValue(stripe.instance);
  return renderForm(
    { createSetupIntent: vi.fn().mockResolvedValue(intent(overrides)) },
    L,
    onSelectExisting,
    checkout,
  );
}

/** A form that has minted its intent and loaded Stripe. */
async function renderReady(
  overrides: Partial<SetupIntent> = {},
  onSelectExisting?: () => void,
) {
  const handlers = renderStripe({}, overrides, onSelectExisting);
  const save = await screen.findByRole("button", {
    name: "Save payment method",
  });
  // Enabled once the fake fields report complete.
  await waitFor(() => expect(save).toBeEnabled());
  return handlers;
}

/** What a browser resolves the probe to, under the default palette. */
const RESOLVED = {
  backgroundColor: "rgb(255, 255, 255)",
  borderTopColor: "rgb(25, 75, 251)",
  borderTopLeftRadius: "10px",
  color: "rgb(0, 0, 0)",
  fontFamily: '"Public Sans", system-ui, sans-serif',
  outlineColor: "rgb(215, 90, 92)",
} as CSSStyleDeclaration;

/**
 * Answers the appearance probe as a browser would; every other element
 * keeps jsdom's answer, which testing-library's queries depend on.
 */
function resolveProbe(onProbe?: (probe: HTMLElement) => void) {
  const real = window.getComputedStyle.bind(window);
  return vi
    .spyOn(window, "getComputedStyle")
    .mockImplementation((element, pseudo) => {
      const probe = element as HTMLElement;
      if (probe.style.color.includes("--schematic-text")) {
        onProbe?.(probe);
        return RESOLVED;
      }
      return real(element, pseudo);
    });
}

describe("PaymentMethodForm", () => {
  beforeEach(() => {
    stripe.confirmSetup.mockReset();
    stripe.elementsProps.mockReset();
    stripe.loadStripe.mockReset();
    stripe.fields = "complete";
    stripe.addressProps.mockReset();
    stripe.addressComplete = false;
  });

  test("holds a place while the intent and Stripe load", () => {
    renderForm({ createSetupIntent: () => new Promise(() => {}) });
    const pending = screen
      .getByText("Loading payment form")
      .closest("[data-state]");
    expect(pending).toHaveAttribute("data-state", "pending");
    expect(pending).toHaveClass("schematic-payment-methods__form");
    expect(
      screen.queryByRole("button", { name: "Save payment method" }),
    ).toBeNull();
  });

  test("loads Stripe with the account's key and mounts the element on the intent", async () => {
    await renderReady();
    expect(stripe.loadStripe).toHaveBeenCalledWith("pk_account", {
      locale: L,
    });
    expect(stripe.elementsProps).toHaveBeenCalledWith({
      options: {
        appearance: { theme: "stripe", variables: expect.any(Object) },
        clientSecret: "seti_secret",
      },
      stripe: stripe.instance,
    });
    expect(screen.getByTestId("payment-element")).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Select existing payment method" }),
    ).toBeNull();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("themes Stripe's iframe from the tokens as the browser resolves them", async () => {
    const computed = resolveProbe();
    try {
      await renderReady();
    } finally {
      computed.mockRestore();
    }
    expect(stripe.elementsProps).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          appearance: {
            theme: "stripe",
            variables: {
              borderRadius: "10px",
              colorBackground: "rgb(255, 255, 255)",
              colorDanger: "rgb(215, 90, 92)",
              colorPrimary: "rgb(25, 75, 251)",
              colorText: "rgb(0, 0, 0)",
              fontFamily: '"Public Sans", system-ui, sans-serif',
            },
          },
        }),
      }),
    );
  });

  test("resolveAppearance reads the tokens through a probe under the host, and leaves it no trace", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const probed = vi.fn((probe: HTMLElement) => {
      expect(probe.parentElement).toBe(host);
      expect(probe.style.visibility).toBe("hidden");
    });
    const computed = resolveProbe(probed);
    try {
      expect(resolveAppearance(host).variables).toMatchObject({
        colorText: "rgb(0, 0, 0)",
        colorBackground: "rgb(255, 255, 255)",
      });
    } finally {
      computed.mockRestore();
      host.remove();
    }
    expect(probed).toHaveBeenCalledTimes(1);
    expect(host.childElementCount).toBe(0);
  });

  test("resolveAppearance drops a token the browser did not resolve, leaving Stripe its default", () => {
    // jsdom hands the `var()` back unresolved; a real browser never does.
    const { variables } = resolveAppearance(document.body);
    expect(variables).not.toHaveProperty("colorText");
    expect(variables).not.toHaveProperty("fontFamily");
    for (const value of Object.values(variables ?? {})) {
      expect(value).not.toContain("var(");
    }
  });

  test("offers the way back to the methods on file when there are any", async () => {
    const onSelectExisting = vi.fn();
    await renderReady({}, onSelectExisting);
    fireEvent.click(
      screen.getByRole("button", { name: "Select existing payment method" }),
    );
    expect(onSelectExisting).toHaveBeenCalledTimes(1);
    expect(stripe.confirmSetup).not.toHaveBeenCalled();
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
    await screen.findByRole("button", { name: "Save payment method" });
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
      "Unable to load payment form.",
    );
    expect(
      screen.queryByRole("button", { name: "Save payment method" }),
    ).toBeNull();
    expect(stripe.loadStripe).not.toHaveBeenCalled();
  });

  test("Stripe failing to load is an error, not a crash", async () => {
    stripe.loadStripe.mockResolvedValue(null);
    renderForm({ createSetupIntent: vi.fn().mockResolvedValue(intent()) });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load payment form. Your browser's security or privacy settings may be blocking it.",
    );
  });

  test("a refused intent reads as the embed words it, with the way back when there is one", async () => {
    const onSelectExisting = vi.fn();
    renderForm(
      { createSetupIntent: vi.fn().mockRejectedValue(new Error("403")) },
      L,
      onSelectExisting,
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "Error initializing payment method change. Please try again.",
    );
    expect(alert).not.toHaveTextContent("403");
    expect(screen.queryByRole("button", { name: "Cancel" })).toBeNull();
    fireEvent.click(
      screen.getByRole("button", { name: "Select existing payment method" }),
    );
    expect(onSelectExisting).toHaveBeenCalledTimes(1);
  });

  test("a refused intent with nothing on file offers no way back but the dialog's close", async () => {
    renderForm({
      createSetupIntent: vi.fn().mockRejectedValue(new Error("403")),
    });
    await screen.findByRole("alert");
    expect(screen.queryByRole("button")).toBeNull();
  });

  test("Save waits for Stripe to call the fields complete", async () => {
    stripe.fields = "incomplete";
    stripe.loadStripe.mockResolvedValue(stripe.instance);
    renderForm({ createSetupIntent: vi.fn().mockResolvedValue(intent()) });
    expect(
      await screen.findByRole("button", { name: "Save payment method" }),
    ).toBeDisabled();
  });

  test("fields Stripe could not load read as a blocked form", async () => {
    stripe.fields = "loadError";
    stripe.loadStripe.mockResolvedValue(stripe.instance);
    renderForm({ createSetupIntent: vi.fn().mockResolvedValue(intent()) });
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load payment form.",
    );
  });

  test("fields that never come up read as a blocked form once the embed's wait runs out", async () => {
    stripe.fields = "silent";
    stripe.loadStripe.mockResolvedValue(stripe.instance);
    // Real time still passes, so the intent and Stripe resolve; the wait is
    // what gets skipped.
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      renderForm({ createSetupIntent: vi.fn().mockResolvedValue(intent()) });
      await screen.findByTestId("payment-element");
      expect(screen.queryByRole("alert")).toBeNull();
      act(() => {
        vi.advanceTimersByTime(10_000);
      });
      expect(screen.getByRole("alert")).toHaveTextContent(
        "Unable to load payment form.",
      );
    } finally {
      vi.useRealTimers();
    }
  });

  test("Save confirms the setup in place and hands back the method", async () => {
    stripe.confirmSetup.mockResolvedValue({
      setupIntent: { payment_method: "pm_new" },
    });
    const { onSaved } = await renderReady();
    fireEvent.click(
      screen.getByRole("button", { name: "Save payment method" }),
    );
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
    fireEvent.click(
      screen.getByRole("button", { name: "Save payment method" }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith("pm_expanded"));
  });

  test("shows Stripe's own message when it declines", async () => {
    stripe.confirmSetup.mockResolvedValue({
      error: { type: "card_error", message: "Your card was declined." },
    });
    const { onSaved } = await renderReady();
    fireEvent.click(
      screen.getByRole("button", { name: "Save payment method" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Your card was declined.",
    );
    expect(onSaved).not.toHaveBeenCalled();
    expect(
      screen.getByRole("button", { name: "Save payment method" }),
    ).toBeEnabled();
  });

  test("any other Stripe error reads as a failed save, not Stripe's wording", async () => {
    stripe.confirmSetup.mockResolvedValue({
      error: { type: "api_error", message: "An internal error occurred." },
    });
    await renderReady();
    fireEvent.click(
      screen.getByRole("button", { name: "Save payment method" }),
    );
    const alert = await screen.findByRole("alert");
    expect(alert).toHaveTextContent(
      "A problem occurred while saving your payment method.",
    );
    expect(alert).not.toHaveTextContent("internal");
  });

  test("Save reads Loading while the setup confirms", async () => {
    stripe.confirmSetup.mockReturnValue(new Promise(() => {}));
    await renderReady();
    fireEvent.click(
      screen.getByRole("button", { name: "Save payment method" }),
    );
    expect(
      await screen.findByRole("button", { name: "Loading" }),
    ).toBeDisabled();
  });

  test("a confirmation that throws reads as a failed save", async () => {
    stripe.confirmSetup.mockRejectedValue(new Error("network"));
    const { onSaved } = await renderReady();
    fireEvent.click(
      screen.getByRole("button", { name: "Save payment method" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A problem occurred while saving your payment method.",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });

  test("a confirmation with no method behind it reads as a failed save", async () => {
    stripe.confirmSetup.mockResolvedValue({
      setupIntent: { payment_method: null },
    });
    const { onSaved } = await renderReady();
    fireEvent.click(
      screen.getByRole("button", { name: "Save payment method" }),
    );
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "A problem occurred while saving your payment method.",
    );
    expect(onSaved).not.toHaveBeenCalled();
  });
  describe("checkout settings", () => {
    test("with none, the form is Stripe's payment fields alone", async () => {
      await renderReady();
      expect(screen.queryByLabelText("Email")).toBeNull();
      expect(screen.queryByTestId("address-element")).toBeNull();
    });

    test("collectEmail adds a required email field, prefilled, and Save waits for a valid one", async () => {
      stripe.confirmSetup.mockResolvedValue({
        setupIntent: { payment_method: "pm_new" },
      });
      renderStripe({
        checkoutPrefill: { billingDetails: { email: "jo@example.com" } },
        checkoutSettings: { collectEmail: true },
      });
      const email = await screen.findByLabelText("Email");
      expect(email).toHaveValue("jo@example.com");
      expect(email).toBeRequired();
      expect(email).toHaveAttribute("placeholder", "Enter email address");
      const save = screen.getByRole("button", { name: "Save payment method" });
      await waitFor(() => expect(save).toBeEnabled());

      fireEvent.change(email, { target: { value: "not an email" } });
      expect(save).toBeDisabled();
      fireEvent.change(email, { target: { value: "typed@example.com" } });
      await waitFor(() => expect(save).toBeEnabled());
      fireEvent.click(save);
      await waitFor(() =>
        expect(stripe.confirmSetup).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmParams: expect.objectContaining({
              payment_method_data: {
                billing_details: { email: "typed@example.com" },
              },
            }),
          }),
        ),
      );
    });

    test("collectAddress adds Stripe's billing address, named from the prefill, and Save waits for it", async () => {
      stripe.confirmSetup.mockResolvedValue({
        setupIntent: { payment_method: "pm_new" },
      });
      renderStripe({
        checkoutPrefill: { billingDetails: { name: "Jo Bloggs" } },
        checkoutSettings: { collectAddress: true },
      });
      const address = await screen.findByTestId("address-element");
      expect(stripe.addressProps).toHaveBeenLastCalledWith({
        defaultValues: { name: "Jo Bloggs" },
        fields: { phone: "never" },
        mode: "billing",
      });
      const save = screen.getByRole("button", { name: "Save payment method" });
      expect(save).toBeDisabled();
      stripe.addressComplete = true;
      fireEvent.click(address);
      await waitFor(() => expect(save).toBeEnabled());
      fireEvent.click(save);
      await waitFor(() =>
        expect(stripe.confirmSetup).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmParams: expect.objectContaining({
              payment_method_data: { billing_details: { name: "Jo Bloggs" } },
            }),
          }),
        ),
      );
    });

    test("collectPhone brings the address fields with the phone, without requiring them", async () => {
      renderStripe({ checkoutSettings: { collectPhone: true } });
      await screen.findByTestId("address-element");
      expect(stripe.addressProps).toHaveBeenLastCalledWith({
        fields: { phone: "always" },
        mode: "billing",
      });
      await waitFor(() =>
        expect(
          screen.getByRole("button", { name: "Save payment method" }),
        ).toBeEnabled(),
      );
    });

    test("the prefilled name is not sent when no address fields are shown", async () => {
      stripe.confirmSetup.mockResolvedValue({
        setupIntent: { payment_method: "pm_new" },
      });
      renderStripe({
        checkoutPrefill: { billingDetails: { name: "Jo Bloggs" } },
      });
      const save = await screen.findByRole("button", {
        name: "Save payment method",
      });
      await waitFor(() => expect(save).toBeEnabled());
      fireEvent.click(save);
      await waitFor(() =>
        expect(stripe.confirmSetup).toHaveBeenCalledWith(
          expect.objectContaining({
            confirmParams: expect.objectContaining({
              payment_method_data: { billing_details: {} },
            }),
          }),
        ),
      );
    });
  });
});
