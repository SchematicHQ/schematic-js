import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingActions,
  type BillingData,
} from "@schematichq/schematic-react";
import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import { StrictMode } from "react";
import { vi } from "vitest";

import type { PaymentMethodFormProps } from "./PaymentMethodForm";
import { PaymentMethods, type PaymentMethodsProps } from "./PaymentMethods";
import { NOW, cardPaymentMethod } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

// The form is Stripe's; here it is a stand-in that reports what the element
// asked of it. Its own behaviour is covered in PaymentMethodForm.test.tsx.
vi.mock("./PaymentMethodForm", () => ({
  default: ({
    checkoutPrefill,
    checkoutSettings,
    onSaved,
    onSelectExisting,
  }: PaymentMethodFormProps) => (
    <div
      data-checkout={JSON.stringify({ checkoutPrefill, checkoutSettings })}
      data-testid="payment-method-form"
    >
      <button type="button" onClick={() => void onSaved("pm_new")}>
        fake save
      </button>
      {onSelectExisting !== undefined && (
        <button type="button" onClick={onSelectExisting}>
          fake select existing
        </button>
      )}
    </div>
  ),
}));

const L = "en-US";

type Handlers = {
  actions?: Partial<BillingActions>;
  status?: React.ComponentProps<typeof BillingDataProvider>["status"];
  onRefetch?: React.ComponentProps<typeof BillingDataProvider>["onRefetch"];
  translate?: React.ComponentProps<typeof BillingDataProvider>["translate"];
};

function renderCard(
  data: BillingData = SCENARIOS.paymentMethods(),
  props: PaymentMethodsProps = {},
  handlers: Handlers = {},
) {
  return render(
    <BillingDataProvider
      actions={handlers.actions}
      data={data}
      status={handlers.status}
      translate={handlers.translate}
      onRefetch={handlers.onRefetch}
    >
      <PaymentMethods locale={L} {...props} />
    </BillingDataProvider>,
  );
}

/** The card's pill: the first on the page, since the dialog repeats it. */
const pill = () => screen.getAllByTestId("schematic-payment-method-current")[0];
const dialog = () => document.querySelector("dialog") as HTMLDialogElement;
const rows = () => screen.getAllByTestId("schematic-payment-method");

/** A default card that expires in the given month, judged from NOW. */
const defaultCard = (cardExpMonth: number, cardExpYear: number) =>
  cardPaymentMethod({
    isDefault: true,
    canRemove: false,
    cardExpMonth,
    cardExpYear,
  });

/** Opens the dialog from the card's Edit or Add. */
function openDialog() {
  fireEvent.click(within(pill()).getByRole("button"));
  return dialog();
}

/** Opens the dialog and unfolds the other methods. */
function chooseDifferent() {
  const modal = openDialog();
  fireEvent.click(
    screen.getByRole("button", { name: "Choose different payment method" }),
  );
  return modal;
}

describe("PaymentMethods", () => {
  beforeEach(() => {
    // Expiry is judged against the clock; the fixtures are dated from NOW.
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("says the methods are loading, without a live region", () => {
    renderCard({});
    const label = screen.getByText("Loading payment methods");
    const pending = label.closest("[data-state]");
    expect(pending).toHaveAttribute("data-state", "pending");
    expect(pending).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("renders the error copy with Try again, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    renderCard(
      {},
      {},
      { status: { paymentMethods: { error: new Error("Boom") } }, onRefetch },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load payment methods",
    );
    expect(screen.getByRole("alert")).not.toHaveTextContent("Boom");
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRefetch).toHaveBeenCalledWith("paymentMethods");
  });

  test("says the methods are not available on a 404 with nothing to show", () => {
    renderCard(
      {},
      {},
      {
        status: {
          paymentMethods: {
            error: new SchematicApiError(404, "/company/payment-methods", {}),
          },
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Payment methods are not available",
    );
    expect(screen.queryByText("No payment method added yet")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("keeps the generic copy for a 404 under a method already on screen", () => {
    renderCard(
      SCENARIOS.paymentMethods(),
      {},
      {
        status: {
          paymentMethods: {
            error: new SchematicApiError(404, "/company/payment-methods", {}),
          },
        },
      },
    );
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load payment methods",
    );
    expect(pill()).toHaveTextContent("Card ending in 4444");
  });

  test("does not ask the translator for error copy on a healthy render", () => {
    const onMissingString = vi.fn();
    render(
      <BillingDataProvider
        data={SCENARIOS.paymentMethods()}
        onMissingString={onMissingString}
        translate={() => undefined}
      >
        <PaymentMethods />
      </BillingDataProvider>,
    );
    expect(onMissingString).toHaveBeenCalledWith("paymentMethodsHeader");
    expect(onMissingString).not.toHaveBeenCalledWith("paymentMethodsError");
    expect(onMissingString).not.toHaveBeenCalledWith(
      "paymentMethodsUnavailable",
    );
  });

  test("shows the default method alone, as the embed's pill, with Edit", () => {
    renderCard();
    expect(
      screen.getByRole("heading", { name: "Payment Details" }),
    ).toBeInTheDocument();
    const current = pill();
    expect(current).toHaveTextContent("Card ending in 4444");
    expect(current).not.toHaveTextContent("Chase");
    expect(current).not.toHaveTextContent("jo@example.com");
    const method = current.querySelector(".schematic-payment-methods__method");
    expect(method).toHaveAttribute("data-kind", "card");
    expect(method).toHaveAttribute("data-brand", "visa");
    expect(
      current.querySelector(".schematic-payment-methods__last4"),
    ).toHaveTextContent("4444");
    expect(within(current).getByRole("button", { name: "Edit" })).toHaveClass(
      "schematic-payment-methods__edit",
    );
    expect(screen.queryByTestId("schematic-payment-method")).toBeNull();
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  describe("the brand's mark", () => {
    /** The glyph inside a method, and only it, as a decorative node. */
    const mark = (scope: HTMLElement) =>
      scope.querySelector(
        ".schematic-payment-methods__method > .schematic-payment-methods__icon",
      );

    test("a Visa card wears the Visa glyph before its label, hidden from readers", () => {
      renderCard();
      const icon = mark(pill());
      expect(icon).toHaveClass("schematic-icon", "schematic-icon--visa");
      expect(icon).toHaveAttribute("aria-hidden", "true");
      expect(icon?.tagName).toBe("I");
      expect(icon?.nextElementSibling).toHaveClass(
        "schematic-payment-methods__label",
      );
      expect(pill()).toHaveTextContent("Card ending in 4444");
    });

    test("a card of a network the font lacks wears the generic card", () => {
      renderCard({
        paymentMethods: [
          cardPaymentMethod({ isDefault: true, cardBrand: "discover" }),
        ],
      });
      expect(mark(pill())).toHaveClass("schematic-icon--credit");
    });

    test("a card with no brand wears the generic card", () => {
      renderCard({
        paymentMethods: [
          cardPaymentMethod({ isDefault: true, cardBrand: null }),
        ],
      });
      expect(mark(pill())).toHaveClass("schematic-icon--credit");
    });

    test("each row in the dialog wears its own", () => {
      renderCard();
      chooseDifferent();
      const [bank, wallet] = rows();
      expect(mark(bank)).toHaveClass("schematic-icon--bank");
      expect(mark(wallet)).toHaveClass("schematic-icon--link");
      for (const icon of document.querySelectorAll(".schematic-icon")) {
        expect(icon).toHaveAttribute("aria-hidden", "true");
      }
    });

    test("the empty pill wears none", () => {
      renderCard(SCENARIOS.paymentMethodsEmpty());
      expect(pill().querySelector(".schematic-icon")).toBeNull();
    });
  });

  test("with no default, the pill is empty and offers Add, whatever else is on file", () => {
    renderCard(SCENARIOS.paymentMethodsNoDefault());
    expect(pill()).toHaveTextContent("No payment method added yet");
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByText("Card ending in")).toBeNull();
  });

  test("renders the empty state, with Add still on offer", () => {
    renderCard(SCENARIOS.paymentMethodsEmpty());
    const empty = screen.getByText("No payment method added yet");
    expect(empty.closest("[data-state]")).toHaveAttribute(
      "data-state",
      "ready",
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("warns beside the heading of a default card about to expire", () => {
    renderCard({
      paymentMethods: [
        defaultCard(10, 2026),
        cardPaymentMethod({ cardExpMonth: 1, cardExpYear: 2020 }),
      ],
    });
    const warning = document.querySelector(
      ".schematic-payment-methods__expiry-warning",
    );
    expect(warning).toHaveTextContent("Expires in 2 mo");
    expect(warning).toHaveAttribute("data-expiry", "soon");
    expect(warning?.closest(".schematic-header")).not.toBeNull();
  });

  test("says one month in the embed's short form", () => {
    renderCard({ paymentMethods: [defaultCard(9, 2026)] });
    expect(screen.getByText("Expires in 1 mo")).toBeInTheDocument();
  });

  test("says Expired once the default card's month has arrived", () => {
    renderCard({ paymentMethods: [defaultCard(8, 2026)] });
    expect(screen.getByText("Expired")).toHaveAttribute(
      "data-expiry",
      "expired",
    );
  });

  test("shows no warning for a card with time left", () => {
    renderCard();
    expect(
      document.querySelector(".schematic-payment-methods__expiry-warning"),
    ).toBeNull();
  });

  test("drops the warning on request", () => {
    renderCard(
      { paymentMethods: [defaultCard(1, 2020)] },
      { showExpiration: false },
    );
    expect(screen.queryByText("Expired")).toBeNull();
    expect(
      screen.getByRole("heading", { name: "Payment Details" }),
    ).toBeInTheDocument();
  });

  test("drops Edit on request", () => {
    renderCard(SCENARIOS.paymentMethods(), { allowEdit: false });
    expect(screen.queryByRole("button", { name: "Edit" })).toBeNull();
    expect(pill()).toHaveTextContent("Card ending in 4444");
  });

  test("drops the heading on request, and the warning that lives in it", () => {
    renderCard(
      { paymentMethods: [defaultCard(8, 2026)] },
      { showHeader: false },
    );
    expect(screen.queryByRole("heading")).toBeNull();
    expect(screen.queryByText("Expired")).toBeNull();
    expect(pill()).toHaveTextContent("Card ending in 4444");
  });

  test("renders its heading at the level the host asks for", () => {
    renderCard(SCENARIOS.paymentMethods(), { headingLevel: 4 });
    expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
  });

  describe("the dialog", () => {
    test("opens under Strict Mode, whose effect replay must not close it", () => {
      render(
        <StrictMode>
          <BillingDataProvider data={SCENARIOS.paymentMethods()}>
            <PaymentMethods locale={L} />
          </BillingDataProvider>
        </StrictMode>,
      );
      const modal = openDialog();
      expect(modal).toHaveAttribute("open");
      expect(
        within(modal).getByRole("heading", { name: "Edit payment details" }),
      ).toBeInTheDocument();
    });

    test("Edit opens it as a modal, titled, on the method on file", () => {
      renderCard();
      const modal = openDialog();
      expect(modal).toHaveAttribute("open");
      expect(modal).toHaveClass(
        "schematic-dialog",
        "schematic-payment-methods__dialog",
      );
      const title = within(modal).getByRole("heading", {
        name: "Edit payment details",
      });
      expect(modal).toHaveAttribute("aria-labelledby", title.id);
      // The pill again, with Remove in place of Edit.
      const current = within(modal).getByTestId(
        "schematic-payment-method-current",
      );
      expect(current).toHaveTextContent("Card ending in 4444");
      expect(
        within(current)
          .getAllByRole("button")
          .map((button) => button.textContent),
      ).toEqual(["Remove"]);
      expect(
        within(modal).getByRole("button", {
          name: "Choose different payment method",
        }),
      ).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("schematic-payment-method")).toBeNull();
      expect(screen.queryByTestId("payment-method-form")).toBeNull();
    });

    test("the header's control closes it", () => {
      renderCard();
      const modal = openDialog();
      fireEvent.click(within(modal).getByRole("button", { name: "Close" }));
      expect(document.querySelector("dialog")).toBeNull();
    });

    test("the header's control is a glyph that keeps its name", () => {
      renderCard();
      const modal = openDialog();
      const close = within(modal).getByRole("button", { name: "Close" });
      expect(close).toHaveClass("schematic-dialog__close");
      expect(close).toHaveTextContent("");
      const glyph = close.querySelector("i");
      expect(glyph).toHaveClass("schematic-icon", "schematic-icon--close");
      expect(glyph).toHaveAttribute("aria-hidden", "true");
    });

    test("the chevron points down while folded and up while unfolded, and the toggle keeps its name", () => {
      renderCard();
      openDialog();
      const toggle = screen.getByRole("button", {
        name: "Choose different payment method",
      });
      const chevron = toggle.querySelector(
        ".schematic-payment-methods__chevron",
      );
      expect(chevron).toHaveClass(
        "schematic-icon",
        "schematic-icon--chevron-down",
      );
      expect(chevron).toHaveAttribute("aria-hidden", "true");
      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      expect(chevron).toHaveClass("schematic-icon--chevron-up");
      expect(chevron).not.toHaveClass("schematic-icon--chevron-down");
      expect(
        screen.getByRole("button", { name: "Choose different payment method" }),
      ).toBe(toggle);
    });

    test("Escape closes it", () => {
      renderCard();
      openDialog();
      fireEvent.keyDown(document.activeElement ?? document.body, {
        key: "Escape",
      });
      expect(document.querySelector("dialog")).toBeNull();
    });

    test("a click on the backdrop closes it; a click inside does not", () => {
      renderCard();
      const modal = openDialog();
      fireEvent.click(within(modal).getByRole("heading", { level: 2 }));
      expect(document.querySelector("dialog")).not.toBeNull();
      fireEvent.click(modal);
      expect(document.querySelector("dialog")).toBeNull();
    });

    test("Choose different unfolds the other methods, and folds them again", () => {
      renderCard();
      chooseDifferent();
      const toggle = screen.getByRole("button", {
        name: "Choose different payment method",
      });
      expect(toggle).toHaveAttribute("aria-expanded", "true");
      const [bank, wallet] = rows();
      expect(rows()).toHaveLength(2);
      expect(bank).toHaveTextContent("Chase 6789");
      expect(bank).toHaveAttribute("data-kind", "bank");
      expect(bank).toHaveAttribute("data-brand", "us_bank_account");
      expect(wallet).toHaveTextContent("jo@example.com");
      expect(wallet).toHaveAttribute("data-kind", "wallet");
      expect(wallet).toHaveAttribute("data-brand", "link");
      expect(
        screen.getByRole("button", { name: "Add new payment method" }),
      ).toHaveClass("schematic-cta");

      fireEvent.click(toggle);
      expect(toggle).toHaveAttribute("aria-expanded", "false");
      expect(screen.queryByTestId("schematic-payment-method")).toBeNull();
      expect(
        screen.queryByRole("button", { name: "Add new payment method" }),
      ).toBeNull();
    });

    test("a card among the others shows when it expires, in the embed's short form", () => {
      renderCard({
        paymentMethods: [
          defaultCard(8, 2027),
          cardPaymentMethod({
            cardLast4: "1881",
            cardExpMonth: 3,
            cardExpYear: 2029,
          }),
        ],
      });
      chooseDifferent();
      const [other] = rows();
      expect(other).toHaveTextContent("Card ending in 1881");
      expect(
        other.querySelector(".schematic-payment-methods__expires"),
      ).toHaveTextContent("Expires 3/29");
    });

    test("with no default, every method is among the others", () => {
      renderCard(SCENARIOS.paymentMethodsNoDefault());
      chooseDifferent();
      expect(rows()).toHaveLength(3);
      expect(
        screen.getAllByRole("button", { name: "Set default" }),
      ).toHaveLength(3);
    });

    test("Set default asks the provider with the method's external id, and leaves the list unfolded", async () => {
      const setDefaultPaymentMethod = vi.fn().mockResolvedValue(undefined);
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { setDefaultPaymentMethod } },
      );
      chooseDifferent();
      fireEvent.click(
        within(rows()[0]).getByRole("button", { name: "Set default" }),
      );
      await waitFor(() =>
        expect(setDefaultPaymentMethod).toHaveBeenCalledWith("pm_bank_ext"),
      );
      // The embed's dialog stays as it was after a write.
      expect(rows()).toHaveLength(2);
      expect(
        screen.getByRole("button", { name: "Choose different payment method" }),
      ).toHaveAttribute("aria-expanded", "true");
      expect(document.querySelector("dialog")).toHaveAttribute("open");
      expect(screen.queryByRole("alert")).toBeNull();
    });

    test("Remove asks the provider with the method's id", async () => {
      const removePaymentMethod = vi.fn().mockResolvedValue(undefined);
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { removePaymentMethod } },
      );
      chooseDifferent();
      const remove = within(rows()[1]).getByRole("button", { name: "Remove" });
      expect(remove).toHaveClass("schematic-payment-methods__remove");
      fireEvent.click(remove);
      await waitFor(() =>
        expect(removePaymentMethod).toHaveBeenCalledWith("pm_link"),
      );
    });

    test("the pill offers Remove in the dialog, as the embed's does, and asks the provider with the default's id", async () => {
      const removePaymentMethod = vi.fn().mockResolvedValue(undefined);
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { removePaymentMethod } },
      );
      expect(
        within(pill()).queryByRole("button", { name: "Remove" }),
      ).toBeNull();
      openDialog();
      const current = within(dialog()).getByTestId(
        "schematic-payment-method-current",
      );
      expect(
        within(current).queryByRole("button", { name: "Edit" }),
      ).toBeNull();
      const remove = within(current).getByRole("button", { name: "Remove" });
      expect(remove).toHaveClass("schematic-payment-methods__remove-current");
      fireEvent.click(remove);
      await waitFor(() =>
        expect(removePaymentMethod).toHaveBeenCalledWith("pm_card"),
      );
    });

    test("the pill offers no Remove where the server refuses it", () => {
      renderCard({ paymentMethods: [defaultCard(8, 2027)] });
      openDialog();
      expect(
        within(
          within(dialog()).getByTestId("schematic-payment-method-current"),
        ).queryByRole("button", { name: "Remove" }),
      ).toBeNull();
    });

    test("offers Remove only where the server allows it", () => {
      renderCard({
        paymentMethods: [
          defaultCard(8, 2027),
          cardPaymentMethod({ id: "kept", canRemove: false }),
          cardPaymentMethod({ id: "loose", canRemove: true }),
        ],
      });
      chooseDifferent();
      const [kept, loose] = rows();
      expect(within(kept).queryByRole("button", { name: "Remove" })).toBeNull();
      expect(
        within(loose).getByRole("button", { name: "Remove" }),
      ).toBeInTheDocument();
    });

    test("disables the actions while a write is on the wire", async () => {
      const setDefaultPaymentMethod = vi.fn(() => new Promise<void>(() => {}));
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { setDefaultPaymentMethod } },
      );
      chooseDifferent();
      fireEvent.click(
        screen.getAllByRole("button", { name: "Set default" })[0],
      );
      await waitFor(() => {
        for (const button of [
          ...screen.getAllByRole("button", { name: "Set default" }),
          ...screen.getAllByRole("button", { name: "Remove" }),
          screen.getByRole("button", { name: "Add new payment method" }),
        ]) {
          expect(button).toBeDisabled();
        }
      });
    });

    test("reports a failed write at the foot of the dialog in the embed's words, and Retry re-runs it", async () => {
      const setDefaultPaymentMethod = vi
        .fn()
        .mockRejectedValue(new Error("The provider refused."));
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { setDefaultPaymentMethod } },
      );
      const modal = chooseDifferent();
      fireEvent.click(
        screen.getAllByRole("button", { name: "Set default" })[0],
      );
      const note = await within(modal).findByRole("alert");
      expect(note).toHaveClass("schematic-payment-methods__error");
      expect(note).toHaveTextContent(
        "Error updating payment method. Please try again.",
      );
      expect(note).not.toHaveTextContent("The provider refused.");
      // The list stays unfolded: a failed write is reported, not undone.
      expect(rows()).toHaveLength(2);

      fireEvent.click(within(note).getByRole("button", { name: "Try again" }));
      await waitFor(() =>
        expect(setDefaultPaymentMethod).toHaveBeenCalledTimes(2),
      );
      expect(setDefaultPaymentMethod).toHaveBeenLastCalledWith("pm_bank_ext");
    });

    test("Add new shows the form, with a way back to the methods on file", async () => {
      renderCard();
      chooseDifferent();
      fireEvent.click(
        screen.getByRole("button", { name: "Add new payment method" }),
      );
      expect(
        await screen.findByTestId("payment-method-form"),
      ).toBeInTheDocument();
      expect(screen.queryByTestId("schematic-payment-method")).toBeNull();
      expect(
        screen.queryByRole("button", {
          name: "Choose different payment method",
        }),
      ).toBeNull();

      fireEvent.click(
        screen.getByRole("button", { name: "fake select existing" }),
      );
      await waitFor(() =>
        expect(screen.queryByTestId("payment-method-form")).toBeNull(),
      );
      expect(
        screen.getByRole("button", {
          name: "Choose different payment method",
        }),
      ).toBeInTheDocument();
      expect(document.querySelector("dialog")).toHaveAttribute("open");
    });

    test("the saved method becomes the default, and the dialog stays on it", async () => {
      const setDefaultPaymentMethod = vi.fn().mockResolvedValue(undefined);
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { setDefaultPaymentMethod } },
      );
      chooseDifferent();
      fireEvent.click(
        screen.getByRole("button", { name: "Add new payment method" }),
      );
      fireEvent.click(await screen.findByRole("button", { name: "fake save" }));
      await waitFor(() =>
        expect(setDefaultPaymentMethod).toHaveBeenCalledWith("pm_new"),
      );
      await waitFor(() =>
        expect(screen.queryByTestId("payment-method-form")).toBeNull(),
      );
      const modal = document.querySelector("dialog") as HTMLElement;
      expect(modal).toHaveAttribute("open");
      expect(
        within(modal).getByTestId("schematic-payment-method-current"),
      ).toHaveTextContent("Card ending in 4444");
      expect(screen.queryByRole("alert")).toBeNull();
    });

    test("a failed remove reads as the embed words it", async () => {
      const removePaymentMethod = vi
        .fn()
        .mockRejectedValue(new Error("The provider refused."));
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { removePaymentMethod } },
      );
      chooseDifferent();
      fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
      expect(await screen.findByRole("alert")).toHaveTextContent(
        "Error deleting payment method. Please try again.",
      );
    });

    test("with nothing on file, Add opens straight into the form, and the dialog's close is the way out", async () => {
      renderCard(SCENARIOS.paymentMethodsEmpty());
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
      expect(
        await screen.findByTestId("payment-method-form"),
      ).toBeInTheDocument();
      expect(
        screen.queryByRole("button", {
          name: "Choose different payment method",
        }),
      ).toBeNull();
      // Nothing to select, so no way back is offered.
      expect(
        screen.queryByRole("button", { name: "fake select existing" }),
      ).toBeNull();
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
    });

    test("hands the checkout settings and prefill to the form", async () => {
      const checkoutSettings = { collectAddress: true, collectEmail: true };
      const checkoutPrefill = { billingDetails: { email: "jo@example.com" } };
      renderCard(SCENARIOS.paymentMethodsEmpty(), {
        checkoutPrefill,
        checkoutSettings,
      });
      fireEvent.click(screen.getByRole("button", { name: "Add" }));
      const form = await screen.findByTestId("payment-method-form");
      expect(JSON.parse(form.getAttribute("data-checkout") ?? "")).toEqual({
        checkoutPrefill,
        checkoutSettings,
      });
    });

    test("a failed write from an earlier session is not shown again on reopening", async () => {
      const removePaymentMethod = vi.fn().mockRejectedValue(new Error("Nope"));
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { removePaymentMethod } },
      );
      chooseDifferent();
      fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
      await screen.findByRole("alert");
      fireEvent.click(screen.getByRole("button", { name: "Close" }));
      openDialog();
      expect(screen.queryByRole("alert")).toBeNull();
    });
  });

  test("keeps the method on screen when a refetch fails", () => {
    renderCard(
      SCENARIOS.paymentMethods(),
      {},
      { status: { paymentMethods: { error: new Error("Later") } } },
    );
    expect(pill()).toHaveTextContent("Card ending in 4444");
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load payment methods",
    );
  });

  test("renames the copy through strings", () => {
    renderCard(SCENARIOS.paymentMethods(), {
      strings: {
        paymentMethodsHeader: "Billing",
        paymentMethodsCardEndingIn: "Card ·",
        paymentMethodsEdit: "Change",
      },
    });
    expect(
      screen.getByRole("heading", { name: "Billing" }),
    ).toBeInTheDocument();
    expect(pill()).toHaveTextContent("Card · 4444");
    expect(screen.getByRole("button", { name: "Change" })).toBeInTheDocument();
  });
});
