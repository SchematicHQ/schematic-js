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
import { vi } from "vitest";

import type { PaymentMethodFormProps } from "./PaymentMethodForm";
import { PaymentMethods, type PaymentMethodsProps } from "./PaymentMethods";
import { NOW, cardPaymentMethod } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

// The form is Stripe's; here it is a stand-in that reports what the element
// asked of it. Its own behaviour is covered in PaymentMethodForm.test.tsx.
vi.mock("./PaymentMethodForm", () => ({
  default: ({ onClose, onSaved, onSelectExisting }: PaymentMethodFormProps) => (
    <div data-testid="payment-method-form">
      <button type="button" onClick={() => void onSaved("pm_new")}>
        fake save
      </button>
      <button type="button" onClick={onClose}>
        fake cancel
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
      screen.getByRole("heading", { name: "Payment details" }),
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
    expect(warning).toHaveTextContent("Expires in 2 months");
    expect(warning).toHaveAttribute("data-expiry", "soon");
    expect(warning?.closest(".schematic-header")).not.toBeNull();
  });

  test("says one month in the singular", () => {
    renderCard({ paymentMethods: [defaultCard(9, 2026)] });
    expect(screen.getByText("Expires in 1 month")).toBeInTheDocument();
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
      screen.getByRole("heading", { name: "Payment details" }),
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
      // The pill again, without Edit: the dialog is where editing happens.
      const current = within(modal).getByTestId(
        "schematic-payment-method-current",
      );
      expect(current).toHaveTextContent("Card ending in 4444");
      expect(within(current).queryByRole("button")).toBeNull();
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
      fireEvent.click(within(modal).getByRole("heading"));
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

    test("Set default asks the provider with the method's external id, and folds the list", async () => {
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
      await waitFor(() =>
        expect(screen.queryByTestId("schematic-payment-method")).toBeNull(),
      );
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

    test("reports a failed write at the foot of the dialog, and Retry re-runs it", async () => {
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
      expect(note).toHaveTextContent("The provider refused.");
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

    test("Cancel on the form returns to the methods on file without a write", async () => {
      const setDefaultPaymentMethod = vi.fn();
      renderCard(
        SCENARIOS.paymentMethods(),
        {},
        { actions: { setDefaultPaymentMethod } },
      );
      chooseDifferent();
      fireEvent.click(
        screen.getByRole("button", { name: "Add new payment method" }),
      );
      fireEvent.click(
        await screen.findByRole("button", { name: "fake cancel" }),
      );
      await waitFor(() =>
        expect(screen.queryByTestId("payment-method-form")).toBeNull(),
      );
      expect(document.querySelector("dialog")).toHaveAttribute("open");
      expect(setDefaultPaymentMethod).not.toHaveBeenCalled();
    });

    test("with nothing on file, Add opens straight into the form, and Cancel closes the dialog", async () => {
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
      fireEvent.click(screen.getByRole("button", { name: "fake cancel" }));
      await waitFor(() => expect(document.querySelector("dialog")).toBeNull());
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
