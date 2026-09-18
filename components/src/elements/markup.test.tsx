import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { Invoices } from "./Invoices";
import { PaymentMethods } from "./PaymentMethods";
import { UpcomingBill } from "./UpcomingBill";
import {
  NOW,
  discount,
  invoice,
  invoicePage,
  upcomingInvoice,
} from "./fixtures/builders";
import { SCENARIOS } from "./fixtures/scenarios";

/**
 * A host that skips <SchematicStyles /> writes CSS against these class names
 * and data attributes, so they are API. A rename, addition, or removal fails
 * here first, which is the moment to decide whether docs and a major version
 * change with it.
 */
function classNames(root: HTMLElement): string[] {
  const names = new Set<string>();
  for (const node of root.querySelectorAll<HTMLElement>("[class]")) {
    for (const name of node.classList) {
      names.add(name);
    }
  }
  return Array.from(names).sort();
}

function renderInvoices(
  data: BillingData,
  status?: React.ComponentProps<typeof BillingDataProvider>["status"],
) {
  const { container } = render(
    <BillingDataProvider data={data} status={status}>
      <Invoices collapsible limit={1} locale="en-US" />
    </BillingDataProvider>,
  );
  return container.firstElementChild as HTMLElement;
}

function renderUpcomingBill(
  data: BillingData,
  status?: React.ComponentProps<typeof BillingDataProvider>["status"],
) {
  const { container } = render(
    <BillingDataProvider data={data} status={status}>
      <UpcomingBill locale="en-US" />
    </BillingDataProvider>,
  );
  return container.firstElementChild as HTMLElement;
}

function renderPaymentMethods(
  data: BillingData,
  status?: React.ComponentProps<typeof BillingDataProvider>["status"],
  actions?: React.ComponentProps<typeof BillingDataProvider>["actions"],
) {
  const { container } = render(
    <BillingDataProvider actions={actions} data={data} status={status}>
      <PaymentMethods locale="en-US" />
    </BillingDataProvider>,
  );
  return container.firstElementChild as HTMLElement;
}

describe("Invoices markup contract", () => {
  test("the loaded card", () => {
    const root = renderInvoices(SCENARIOS.pro());
    expect(root.className).toBe("schematic-card schematic-invoices");
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toEqual([
      "schematic-header",
      "schematic-header__title",
      "schematic-invoices__actions",
      "schematic-invoices__amount",
      "schematic-invoices__chevron",
      "schematic-invoices__date",
      "schematic-invoices__link",
      "schematic-invoices__list",
      "schematic-invoices__row",
      "schematic-invoices__see-more",
      "schematic-link-button",
    ]);
    expect(screen.getByTestId("schematic-invoice")).toBeInTheDocument();
    expect(root.querySelector(".schematic-invoices__see-more")).toHaveAttribute(
      "aria-expanded",
      "false",
    );
  });

  test("the empty card", () => {
    const root = renderInvoices(SCENARIOS.trialing());
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toEqual([
      "schematic-header",
      "schematic-header__title",
      "schematic-invoices__empty",
      "schematic-muted",
    ]);
  });

  test("the credit note, once the list is expanded", () => {
    const root = renderInvoices(SCENARIOS.pro());
    fireEvent.click(screen.getByRole("button", { name: "See more" }));
    expect(classNames(root)).toContain("schematic-invoices__credit");
  });

  test("the pending card keeps the card's own shape", () => {
    const root = renderInvoices({}, { invoices: { isPending: true } });
    expect(root.className).toBe("schematic-card schematic-invoices");
    expect(root).toHaveAttribute("data-state", "pending");
    expect(root).toHaveAttribute("aria-busy", "true");
    // No live region; see StatusFrame.
    expect(root).not.toHaveAttribute("role");
    expect(classNames(root)).toEqual([
      "schematic-hidden",
      "schematic-skeleton",
      "schematic-skeleton__cell",
      "schematic-skeleton__heading",
      "schematic-skeleton__row",
    ]);
  });

  test("the pending card promises the columns the list will render", () => {
    const root = renderInvoices({}, { invoices: { isPending: true } });
    // `limit` is 1 here.
    expect(root.querySelectorAll(".schematic-skeleton__row")).toHaveLength(1);
    expect(
      Array.from(
        root.querySelectorAll<HTMLElement>(".schematic-skeleton__cell"),
        (cell) => cell.dataset.column,
      ),
    ).toEqual(["date", "amount"]);
  });

  test("a hidden column is absent from the skeleton too", () => {
    render(
      <BillingDataProvider data={{}} status={{ invoices: { isPending: true } }}>
        <Invoices showAmount={false} showHeader={false} />
      </BillingDataProvider>,
    );
    const pending = screen
      .getByText("Loading invoices")
      .closest("[data-state='pending']") as HTMLElement;
    // The default `limit` of 10 is capped at SKELETON_ROWS.
    const rows = pending.querySelectorAll(".schematic-skeleton__row");
    expect(rows).toHaveLength(4);
    expect(
      Array.from(
        rows[0].querySelectorAll<HTMLElement>(".schematic-skeleton__cell"),
        (cell) => cell.dataset.column,
      ),
    ).toEqual(["date"]);
    expect(pending.querySelector(".schematic-skeleton__heading")).toBeNull();
  });

  test("the failed card", () => {
    const root = renderInvoices({}, { invoices: { error: new Error("Boom") } });
    expect(root.className).toBe("schematic-card schematic-invoices");
    expect(root).toHaveAttribute("data-state", "error");
    expect(classNames(root)).toEqual([
      "schematic-error",
      "schematic-link-button",
      "schematic-status",
      "schematic-status__message",
      "schematic-status__retry",
    ]);
  });

  test("a failure with rows still on screen", () => {
    const root = renderInvoices(SCENARIOS.pro(), {
      invoices: { error: new Error("Boom") },
    });
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toContain("schematic-status-note");
  });
});

describe("UpcomingBill markup contract", () => {
  test("the loaded card", () => {
    const root = renderUpcomingBill(SCENARIOS.pro());
    expect(root.className).toBe("schematic-card schematic-upcoming-bill");
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toEqual([
      "schematic-chip",
      "schematic-header",
      "schematic-header__title",
      "schematic-row",
      "schematic-row__label",
      "schematic-row__value",
      "schematic-small",
      "schematic-upcoming-bill__amount",
      "schematic-upcoming-bill__balance-applied",
      "schematic-upcoming-bill__balance-remaining",
      "schematic-upcoming-bill__code",
      "schematic-upcoming-bill__discount",
      "schematic-upcoming-bill__discount-row",
      "schematic-upcoming-bill__discount-value",
      "schematic-upcoming-bill__discounts",
      "schematic-upcoming-bill__estimate",
      "schematic-upcoming-bill__rows",
      "schematic-upcoming-bill__total",
    ]);
  });

  test("the card with nothing to bill", () => {
    const root = renderUpcomingBill(SCENARIOS.unbilled());
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toEqual([
      "schematic-muted",
      "schematic-upcoming-bill__empty",
    ]);
  });

  test("a bill with no balance or discounts drops the rows block", () => {
    const root = renderUpcomingBill(SCENARIOS.trialing());
    expect(classNames(root)).not.toContain("schematic-upcoming-bill__rows");
  });

  test("a bill with no due date drops the header", () => {
    const root = renderUpcomingBill({
      upcomingInvoice: upcomingInvoice({ dueDate: null }),
    });
    expect(classNames(root)).not.toContain("schematic-header");
  });

  test("the pending card keeps the card's own shape", () => {
    const root = renderUpcomingBill(
      {},
      { upcomingInvoice: { isPending: true } },
    );
    expect(root.className).toBe("schematic-card schematic-upcoming-bill");
    expect(root).toHaveAttribute("data-state", "pending");
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).not.toHaveAttribute("role");
    expect(classNames(root)).toEqual([
      "schematic-hidden",
      "schematic-skeleton",
      "schematic-skeleton__cell",
      "schematic-skeleton__heading",
      "schematic-skeleton__row",
    ]);
    expect(
      Array.from(
        root.querySelectorAll<HTMLElement>(".schematic-skeleton__cell"),
        (cell) => cell.dataset.column,
      ),
    ).toEqual(["amount", "row"]);
  });

  test("the failed card", () => {
    const root = renderUpcomingBill(
      {},
      { upcomingInvoice: { error: new Error("Boom") } },
    );
    expect(root.className).toBe("schematic-card schematic-upcoming-bill");
    expect(root).toHaveAttribute("data-state", "error");
    expect(classNames(root)).toEqual([
      "schematic-error",
      "schematic-link-button",
      "schematic-status",
      "schematic-status__message",
      "schematic-status__retry",
    ]);
  });

  test("a failure with the bill still on screen", () => {
    const root = renderUpcomingBill(SCENARIOS.pro(), {
      upcomingInvoice: { error: new Error("Boom") },
    });
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toContain("schematic-status-note");
  });
});

describe("PaymentMethods markup contract", () => {
  beforeEach(() => {
    // Expiry is judged against the clock; the fixtures are dated from NOW.
    vi.useFakeTimers({ now: NOW, toFake: ["Date"] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  test("the loaded card", () => {
    const root = renderPaymentMethods(SCENARIOS.paymentMethods());
    expect(root.className).toBe("schematic-card schematic-payment-methods");
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toEqual([
      "schematic-badge",
      "schematic-cta",
      "schematic-cta--small",
      "schematic-header",
      "schematic-header__title",
      "schematic-link-button",
      "schematic-payment-methods__actions",
      "schematic-payment-methods__add",
      "schematic-payment-methods__brand",
      "schematic-payment-methods__default",
      "schematic-payment-methods__expires",
      "schematic-payment-methods__last4",
      "schematic-payment-methods__list",
      "schematic-payment-methods__make-default",
      "schematic-payment-methods__method",
      "schematic-payment-methods__remove",
      "schematic-payment-methods__row",
      "schematic-small",
    ]);
    const rows = root.querySelectorAll<HTMLElement>(
      ".schematic-payment-methods__row",
    );
    expect(rows).toHaveLength(3);
    expect(rows[0].dataset).toMatchObject({ brand: "visa", default: "true" });
    expect(rows[1].dataset).toMatchObject({
      brand: "us_bank_account",
      default: "false",
    });
    expect(rows[2].dataset).toMatchObject({ brand: "link", default: "false" });
    expect(
      root.querySelector(".schematic-payment-methods__expires"),
    ).toHaveAttribute("data-expiry", "ok");
    expect(screen.getAllByTestId("schematic-payment-method")[0]).toBe(rows[0]);
  });

  test("the card with no default", () => {
    const root = renderPaymentMethods(SCENARIOS.paymentMethodsNoDefault());
    const names = classNames(root);
    expect(names).not.toContain("schematic-badge");
    expect(names).not.toContain("schematic-payment-methods__default");
    expect(
      root.querySelectorAll(".schematic-payment-methods__make-default"),
    ).toHaveLength(3);
  });

  test("the empty card", () => {
    const root = renderPaymentMethods(SCENARIOS.paymentMethodsEmpty());
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toEqual([
      "schematic-cta",
      "schematic-cta--small",
      "schematic-header",
      "schematic-header__title",
      "schematic-muted",
      "schematic-payment-methods__add",
      "schematic-payment-methods__empty",
    ]);
  });

  test("the pending card keeps the card's own shape", () => {
    const root = renderPaymentMethods(
      {},
      { paymentMethods: { isPending: true } },
    );
    expect(root.className).toBe("schematic-card schematic-payment-methods");
    expect(root).toHaveAttribute("data-state", "pending");
    expect(root).toHaveAttribute("aria-busy", "true");
    expect(root).not.toHaveAttribute("role");
    expect(classNames(root)).toEqual([
      "schematic-hidden",
      "schematic-skeleton",
      "schematic-skeleton__cell",
      "schematic-skeleton__heading",
      "schematic-skeleton__row",
    ]);
    expect(
      Array.from(
        root.querySelectorAll<HTMLElement>(".schematic-skeleton__cell"),
        (cell) => cell.dataset.column,
      ),
    ).toEqual(["method", "actions", "method", "actions"]);
  });

  test("the failed card", () => {
    const root = renderPaymentMethods(
      {},
      { paymentMethods: { error: new Error("Boom") } },
    );
    expect(root.className).toBe("schematic-card schematic-payment-methods");
    expect(root).toHaveAttribute("data-state", "error");
    expect(classNames(root)).toEqual([
      "schematic-error",
      "schematic-link-button",
      "schematic-status",
      "schematic-status__message",
      "schematic-status__retry",
    ]);
  });

  test("a failure with rows still on screen", () => {
    const root = renderPaymentMethods(SCENARIOS.paymentMethods(), {
      paymentMethods: { error: new Error("Boom") },
    });
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toContain("schematic-status-note");
  });

  test("a failed write, reported under the rows", async () => {
    const root = renderPaymentMethods(SCENARIOS.paymentMethods(), undefined, {
      setDefaultPaymentMethod: vi.fn().mockRejectedValue(new Error("Nope")),
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Make default" })[0]);
    await waitFor(() =>
      expect(classNames(root)).toContain(
        "schematic-payment-methods__write-error",
      ),
    );
    expect(classNames(root)).toEqual(
      expect.arrayContaining([
        "schematic-error",
        "schematic-status-note",
        "schematic-payment-methods__write-error",
        "schematic-payment-methods__write-error-message",
        "schematic-payment-methods__write-retry",
      ]),
    );
    expect(root).toHaveAttribute("data-state", "ready");
  });
});

/**
 * Every node an element renders carries a class, so a host's CSS never has
 * to reach by tag or position and never breaks when a node moves.
 */
function unclassed(root: HTMLElement): string[] {
  const nodes = [root, ...root.querySelectorAll<HTMLElement>("*")];
  return nodes
    .filter(
      (node) =>
        !Array.from(node.classList).some((name) =>
          name.startsWith("schematic-"),
        ),
    )
    .map((node) => `${node.tagName.toLowerCase()}.${node.className}`);
}

describe("every node carries a schematic class", () => {
  const pending = { isPending: true };
  const failed = { error: new Error("Boom") };

  test.each([
    ["loaded", SCENARIOS.pro(), undefined],
    ["empty", SCENARIOS.trialing(), undefined],
    ["pending", {}, { invoices: pending }],
    ["failed", {}, { invoices: failed }],
    ["failed with rows on screen", SCENARIOS.pro(), { invoices: failed }],
  ] as const)("Invoices, %s", (_state, data, status) => {
    expect(unclassed(renderInvoices(data, status))).toEqual([]);
  });

  test("Invoices, a row whose invoice has no hosted URL", () => {
    const data = SCENARIOS.pro();
    data.invoices = invoicePage([invoice({ url: null })]);
    expect(unclassed(renderInvoices(data))).toEqual([]);
  });

  test("Invoices, expanded past the collapsed rows", () => {
    const root = renderInvoices(SCENARIOS.pro());
    fireEvent.click(screen.getByRole("button", { name: "See more" }));
    expect(unclassed(root)).toEqual([]);
  });

  test.each([
    ["loaded", SCENARIOS.pro(), undefined],
    ["loaded, nothing to bill", SCENARIOS.unbilled(), undefined],
    ["loaded, no balance or discounts", SCENARIOS.trialing(), undefined],
    ["pending", {}, { upcomingInvoice: pending }],
    ["failed", {}, { upcomingInvoice: failed }],
    [
      "failed with the bill on screen",
      SCENARIOS.pro(),
      { upcomingInvoice: failed },
    ],
  ] as const)("UpcomingBill, %s", (_state, data, status) => {
    expect(unclassed(renderUpcomingBill(data, status))).toEqual([]);
  });

  test("UpcomingBill, a coupon with no promo code", () => {
    const root = renderUpcomingBill({
      upcomingInvoice: upcomingInvoice({
        discounts: [discount({ customerFacingCode: null })],
      }),
    });
    expect(unclassed(root)).toEqual([]);
  });

  test.each([
    ["loaded", SCENARIOS.paymentMethods(), undefined],
    ["loaded, no default", SCENARIOS.paymentMethodsNoDefault(), undefined],
    ["empty", SCENARIOS.paymentMethodsEmpty(), undefined],
    ["pending", {}, { paymentMethods: pending }],
    ["failed", {}, { paymentMethods: failed }],
    [
      "failed with rows on screen",
      SCENARIOS.paymentMethods(),
      { paymentMethods: failed },
    ],
  ] as const)("PaymentMethods, %s", (_state, data, status) => {
    expect(unclassed(renderPaymentMethods(data, status))).toEqual([]);
  });

  test("PaymentMethods, a failed write", async () => {
    const root = renderPaymentMethods(SCENARIOS.paymentMethods(), undefined, {
      removePaymentMethod: vi.fn().mockRejectedValue(new Error("Nope")),
    });
    fireEvent.click(screen.getAllByRole("button", { name: "Remove" })[0]);
    await screen.findByRole("alert");
    expect(unclassed(root)).toEqual([]);
  });
});
