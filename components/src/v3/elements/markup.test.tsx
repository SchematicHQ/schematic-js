import {
  CompanyDataProvider,
  type CompanyData,
} from "@schematichq/schematic-react";
import { fireEvent, render, screen } from "@testing-library/react";

import { SCENARIOS } from "../fixtures/scenarios";

import { Invoices } from "./Invoices";

/**
 * The markup contract. A host that skips <SchematicStyles /> writes CSS
 * against these class names and data attributes, so they are API: this test
 * fails when one is renamed, added, or dropped, which is the moment to
 * decide whether the docs and a major version should change with it.
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
  data: CompanyData,
  status?: React.ComponentProps<typeof CompanyDataProvider>["status"],
) {
  const { container } = render(
    <CompanyDataProvider data={data} status={status}>
      <Invoices collapsible limit={1} locale="en-US" showStatus />
    </CompanyDataProvider>,
  );
  return container.firstElementChild as HTMLElement;
}

describe("Invoices markup contract", () => {
  test("the loaded card", () => {
    const root = renderInvoices(SCENARIOS.pro());
    expect(root.className).toBe("schematic-card schematic-invoices");
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toEqual([
      "schematic-chip",
      "schematic-header",
      "schematic-invoices__actions",
      "schematic-invoices__amount",
      "schematic-invoices__date",
      "schematic-invoices__status",
      "schematic-invoices__table",
      "schematic-link-button",
      "schematic-muted",
      "schematic-small",
    ]);
    expect(screen.getByTestId("schematic-invoice")).toBeInTheDocument();
    expect(root.querySelector(".schematic-chip")).toHaveAttribute(
      "data-status",
      "paid",
    );
  });

  test("the empty card", () => {
    const root = renderInvoices(SCENARIOS.trialing());
    expect(root).toHaveAttribute("data-state", "ready");
    expect(classNames(root)).toEqual([
      "schematic-header",
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
    // The role is what lets the label be announced; the attribute alone is
    // dropped on a generic element.
    expect(root).toHaveAttribute("role", "status");
    expect(classNames(root)).toEqual([
      "schematic-skeleton",
      "schematic-skeleton__cell",
      "schematic-skeleton__heading",
      "schematic-skeleton__row",
    ]);
  });

  test("the pending card promises the columns the table will render", () => {
    const root = renderInvoices({}, { invoices: { isPending: true } });
    // `limit` is 1 here, so one row stands in for the collapsed card.
    expect(root.querySelectorAll(".schematic-skeleton__row")).toHaveLength(1);
    expect(
      Array.from(
        root.querySelectorAll<HTMLElement>(".schematic-skeleton__cell"),
        (cell) => cell.dataset.column,
      ),
    ).toEqual(["date", "amount", "status"]);
  });

  test("a hidden column is absent from the skeleton too", () => {
    render(
      <CompanyDataProvider data={{}} status={{ invoices: { isPending: true } }}>
        <Invoices showAmount={false} showHeader={false} />
      </CompanyDataProvider>,
    );
    const pending = screen.getByRole("status");
    // The default `limit` of 10 is capped at four rows.
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
