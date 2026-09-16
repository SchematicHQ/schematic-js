import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen } from "@testing-library/react";

import { Invoices } from "./Invoices";
import { invoice, invoicePage } from "./fixtures/builders";
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
});
