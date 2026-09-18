import { SchematicApiError } from "@schematichq/schematic-js";
import {
  BillingDataProvider,
  type BillingActions,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import type { PaymentMethodFormProps } from "./PaymentMethodForm";
import { PaymentMethods, type PaymentMethodsProps } from "./PaymentMethods";
import { NOW, cardPaymentMethod } from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

// The form is Stripe's; here it is a stand-in that reports what the element
// asked of it. Its own behaviour is covered in PaymentMethodForm.test.tsx.
vi.mock("./PaymentMethodForm", () => ({
  default: ({ onClose, onSaved }: PaymentMethodFormProps) => (
    <div data-testid="payment-method-form">
      <button type="button" onClick={() => void onSaved("pm_new")}>
        fake save
      </button>
      <button type="button" onClick={onClose}>
        fake cancel
      </button>
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

function renderList(
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

const rows = () => screen.getAllByTestId("schematic-payment-method");

describe("PaymentMethods", () => {
  beforeEach(() => {
    // Expiry is judged against the clock; the fixtures are dated from NOW.
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("says the methods are loading, without a live region", () => {
    renderList({});
    const label = screen.getByText("Loading payment methods");
    const pending = label.closest("[data-state]");
    expect(pending).toHaveAttribute("data-state", "pending");
    expect(pending).toHaveAttribute("aria-busy", "true");
    expect(screen.queryByRole("status")).toBeNull();
  });

  test("renders the error copy with Try again, and the retry reaches the provider", () => {
    const onRefetch = vi.fn();
    renderList(
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
    renderList(
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
    expect(screen.queryByText("No payment method on file")).toBeNull();
    expect(
      screen.getByRole("button", { name: "Try again" }),
    ).toBeInTheDocument();
  });

  test("keeps the generic copy for a 404 under rows already on screen", () => {
    renderList(
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
    expect(rows()).toHaveLength(3);
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

  test("renders the list: brand, digits, the default badge, and expiry", () => {
    renderList();
    expect(
      screen.getByRole("heading", { name: "Payment methods" }),
    ).toBeInTheDocument();
    const [card, bank, wallet] = rows();

    expect(card).toHaveAttribute("data-default", "true");
    expect(card).toHaveAttribute("data-brand", "visa");
    expect(
      card.querySelector(".schematic-payment-methods__brand"),
    ).toHaveTextContent("Visa");
    expect(
      card.querySelector(".schematic-payment-methods__last4"),
    ).toHaveTextContent("···· 4242");
    expect(card.querySelector(".schematic-badge")).toHaveTextContent("Default");
    const expires = card.querySelector(".schematic-payment-methods__expires");
    expect(expires).toHaveTextContent("Expires 08/2027");
    expect(expires).toHaveAttribute("data-expiry", "ok");

    expect(bank).toHaveAttribute("data-default", "false");
    expect(bank).toHaveAttribute("data-brand", "us_bank_account");
    expect(bank).toHaveTextContent("Chase");
    expect(bank).toHaveTextContent("···· 6789");
    expect(bank.querySelector(".schematic-badge")).toBeNull();
    expect(
      bank.querySelector(".schematic-payment-methods__expires"),
    ).toBeNull();

    expect(wallet).toHaveAttribute("data-brand", "link");
    expect(wallet).toHaveTextContent("Link · jo@example.com");
    expect(
      wallet.querySelector(".schematic-payment-methods__last4"),
    ).toBeNull();
  });

  test("offers Make default on every row but the default", () => {
    renderList();
    const [card, bank, wallet] = rows();
    expect(
      card.querySelector(".schematic-payment-methods__make-default"),
    ).toBeNull();
    expect(
      bank.querySelector(".schematic-payment-methods__make-default"),
    ).toHaveTextContent("Make default");
    expect(
      wallet.querySelector(".schematic-payment-methods__make-default"),
    ).toHaveTextContent("Make default");
  });

  test("offers Remove only where the server allows it", () => {
    // The default cannot go while others exist; the server says so.
    renderList();
    const [card, bank, wallet] = rows();
    expect(card.querySelector(".schematic-payment-methods__remove")).toBeNull();
    expect(
      bank.querySelector(".schematic-payment-methods__remove"),
    ).toHaveTextContent("Remove");
    expect(
      wallet.querySelector(".schematic-payment-methods__remove"),
    ).toHaveTextContent("Remove");
  });

  test("with no default: no badge, and Make default on every row", () => {
    renderList(SCENARIOS.paymentMethodsNoDefault());
    expect(screen.queryByText("Default")).toBeNull();
    expect(document.querySelectorAll(".schematic-badge")).toHaveLength(0);
    expect(
      screen.getAllByRole("button", { name: "Make default" }),
    ).toHaveLength(3);
    for (const row of rows()) {
      expect(row).toHaveAttribute("data-default", "false");
    }
  });

  test("renders the empty state, with Add still on offer", () => {
    renderList(SCENARIOS.paymentMethodsEmpty());
    const empty = screen.getByText("No payment method on file");
    expect(empty.closest("[data-state]")).toHaveAttribute(
      "data-state",
      "ready",
    );
    expect(screen.queryByTestId("schematic-payment-method")).toBeNull();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("Make default asks the provider with the method's external id", async () => {
    const setDefaultPaymentMethod = vi.fn().mockResolvedValue(undefined);
    renderList(
      SCENARIOS.paymentMethods(),
      {},
      {
        actions: { setDefaultPaymentMethod },
      },
    );
    fireEvent.click(
      rows()[1].querySelector(
        ".schematic-payment-methods__make-default",
      ) as HTMLElement,
    );
    await waitFor(() =>
      expect(setDefaultPaymentMethod).toHaveBeenCalledWith("pm_bank_ext"),
    );
    expect(screen.queryByRole("alert")).toBeNull();
  });

  test("Remove asks the provider with the method's id", async () => {
    const removePaymentMethod = vi.fn().mockResolvedValue(undefined);
    renderList(
      SCENARIOS.paymentMethods(),
      {},
      {
        actions: { removePaymentMethod },
      },
    );
    fireEvent.click(
      rows()[2].querySelector(
        ".schematic-payment-methods__remove",
      ) as HTMLElement,
    );
    await waitFor(() =>
      expect(removePaymentMethod).toHaveBeenCalledWith("pm_link"),
    );
  });

  test("disables the actions while a write is on the wire", async () => {
    const setDefaultPaymentMethod = vi.fn(() => new Promise<void>(() => {}));
    renderList(
      SCENARIOS.paymentMethods(),
      {},
      {
        actions: { setDefaultPaymentMethod },
      },
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Make default" })[0]);
    await waitFor(() => {
      for (const button of [
        ...screen.getAllByRole("button", { name: "Make default" }),
        ...screen.getAllByRole("button", { name: "Remove" }),
      ]) {
        expect(button).toBeDisabled();
      }
    });
  });

  test("reports a failed write under the list, and Retry re-runs it", async () => {
    const setDefaultPaymentMethod = vi
      .fn()
      .mockRejectedValue(new Error("The provider refused."));
    renderList(
      SCENARIOS.paymentMethods(),
      {},
      {
        actions: { setDefaultPaymentMethod },
      },
    );
    fireEvent.click(screen.getAllByRole("button", { name: "Make default" })[0]);
    const note = await screen.findByRole("alert");
    expect(note).toHaveClass("schematic-status-note");
    expect(note).toHaveTextContent("The provider refused.");
    // The rows stay: a failed write is reported, not a failed read.
    expect(rows()).toHaveLength(3);
    expect(
      screen.getByRole("heading", { name: "Payment methods" }),
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    await waitFor(() =>
      expect(setDefaultPaymentMethod).toHaveBeenCalledTimes(2),
    );
    expect(setDefaultPaymentMethod).toHaveBeenLastCalledWith("pm_bank_ext");
  });

  test("Add opens the form, and the saved method becomes the default", async () => {
    const setDefaultPaymentMethod = vi.fn().mockResolvedValue(undefined);
    renderList(
      SCENARIOS.paymentMethods(),
      {},
      {
        actions: { setDefaultPaymentMethod },
      },
    );
    expect(screen.queryByTestId("payment-method-form")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    const form = await screen.findByTestId("payment-method-form");
    expect(form).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Add" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "fake save" }));
    await waitFor(() =>
      expect(setDefaultPaymentMethod).toHaveBeenCalledWith("pm_new"),
    );
    await waitFor(() =>
      expect(screen.queryByTestId("payment-method-form")).toBeNull(),
    );
    expect(screen.getByRole("button", { name: "Add" })).toBeEnabled();
  });

  test("Cancel closes the form without a write", async () => {
    const setDefaultPaymentMethod = vi.fn();
    renderList(
      SCENARIOS.paymentMethods(),
      {},
      {
        actions: { setDefaultPaymentMethod },
      },
    );
    fireEvent.click(screen.getByRole("button", { name: "Add" }));
    await screen.findByTestId("payment-method-form");
    fireEvent.click(screen.getByRole("button", { name: "fake cancel" }));
    await waitFor(() =>
      expect(screen.queryByTestId("payment-method-form")).toBeNull(),
    );
    expect(setDefaultPaymentMethod).not.toHaveBeenCalled();
  });

  test("warns of a card about to expire, and says when one has", () => {
    renderList({
      paymentMethods: [
        cardPaymentMethod({ id: "soon", cardExpMonth: 10, cardExpYear: 2026 }),
        cardPaymentMethod({ id: "gone", cardExpMonth: 5, cardExpYear: 2026 }),
      ],
    });
    const [soon, gone] = rows();
    const soonText = soon.querySelector(".schematic-payment-methods__expires");
    expect(soonText).toHaveTextContent("Expires soon · 10/2026");
    expect(soonText).toHaveAttribute("data-expiry", "soon");
    const goneText = gone.querySelector(".schematic-payment-methods__expires");
    expect(goneText).toHaveTextContent("Expired 05/2026");
    expect(goneText).toHaveAttribute("data-expiry", "expired");
  });

  test("drops Add on request", () => {
    renderList(SCENARIOS.paymentMethods(), { allowAdd: false });
    expect(screen.queryByRole("button", { name: "Add" })).toBeNull();
    expect(rows()).toHaveLength(3);
  });

  test("drops Remove and Make default on request", () => {
    renderList(SCENARIOS.paymentMethods(), { allowRemove: false });
    expect(screen.queryByRole("button", { name: "Remove" })).toBeNull();
    expect(screen.queryByRole("button", { name: "Make default" })).toBeNull();
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  test("drops the expiry on request", () => {
    renderList(SCENARIOS.paymentMethods(), { showExpiration: false });
    expect(
      document.querySelector(".schematic-payment-methods__expires"),
    ).toBeNull();
    expect(screen.queryByText(/Expires/)).toBeNull();
  });

  test("drops the heading on request, and labels the list by the same text", () => {
    renderList(SCENARIOS.paymentMethods(), { showHeader: false });
    expect(screen.queryByRole("heading")).toBeNull();
    expect(
      screen.getByRole("list", { name: "Payment methods" }),
    ).toBeInTheDocument();
    // Add keeps its place without a heading beside it.
    expect(screen.getByRole("button", { name: "Add" })).toBeInTheDocument();
  });

  test("renders its heading at the level the host asks for", () => {
    renderList(SCENARIOS.paymentMethods(), { headingLevel: 4 });
    expect(screen.getByRole("heading", { level: 4 })).toBeInTheDocument();
  });

  test("keeps the rows on screen when a refetch fails", () => {
    renderList(
      SCENARIOS.paymentMethods(),
      {},
      {
        status: { paymentMethods: { error: new Error("Later") } },
      },
    );
    expect(rows()).toHaveLength(3);
    expect(screen.getByRole("alert")).toHaveTextContent(
      "Could not load payment methods",
    );
  });

  test("renames the copy through strings", () => {
    renderList(SCENARIOS.paymentMethods(), {
      strings: {
        paymentMethodsHeader: "Cards on file",
        paymentMethodsLast4: "ending in {{last4}}",
      },
    });
    expect(
      screen.getByRole("heading", { name: "Cards on file" }),
    ).toBeInTheDocument();
    expect(rows()[0]).toHaveTextContent("ending in 4242");
  });

  test("formats the expiry for the locale it is given", () => {
    // Japanese writes the year first.
    renderList(SCENARIOS.paymentMethods(), { locale: "ja-JP" });
    const expires = rows()[0].querySelector(
      ".schematic-payment-methods__expires",
    );
    expect(expires).toHaveTextContent("2027/08");
    expect(expires).not.toHaveTextContent("08/2027");
  });
});
