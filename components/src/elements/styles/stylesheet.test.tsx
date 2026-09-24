import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { fireEvent, render, waitFor } from "@testing-library/react";
import { vi } from "vitest";

import { Invoices } from "../Invoices";
import { PaymentMethods } from "../PaymentMethods";
import { UpcomingBill } from "../UpcomingBill";
import { cardPaymentMethod, invoice, invoicePage } from "../fixtures/builders";
import { SCENARIOS, paymentMethodSet } from "../fixtures/scenarios";

import { withTokenDefaults } from "./tokens";

import { SCHEMATIC_TOKENS, schematicStylesCss } from ".";

/**
 * The sheet and the markup are one contract in two files. A rule that no
 * longer matches anything is a rename that only got halfway, so every rule
 * aimed at a shipped element is checked against the element in every state.
 *
 * Rules for elements not yet shipped match nothing by definition and are
 * skipped; `schematic-badge` is among them, worn only by the plan cards.
 */
const SHIPPED =
  /schematic-(invoices|upcoming-bill|payment-methods|dialog|row|chip|small|card|header|status|skeleton|muted|error|link-button)/;

/**
 * The pending fallback for an element that passes no skeleton of its own —
 * every shipped element passes one, so nothing here can match it — and the
 * loaded Add form, which renders inside Stripe's `<Elements>` and cannot be
 * staged without it. PaymentMethodForm.test.tsx covers the form's markup.
 */
const UNREACHABLE = new Set([
  ".schematic-skeleton:empty",
  ".schematic-payment-methods__save",
  ".schematic-payment-methods__select-existing",
]);

/**
 * The icon font's own rules: the base class and one `--<name>` per glyph in
 * the package. Only a handful of the glyphs are rendered by any element, so
 * the family is left out of the walk; icons.test.ts checks it against the
 * package instead.
 */
const ICON_FAMILY = /^\.schematic-icon(--[a-z0-9-]+)?(::before)?$/;

function shippedSelectors(): string[] {
  const stripped = schematicStylesCss
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .replace(/@(media|keyframes)[^{]*\{(?:[^{}]*\{[^{}]*\})*[^{}]*\}/g, "");
  const out = new Set<string>();
  for (const [, head] of stripped.matchAll(/([^{}]+)\{[^{}]*\}/g)) {
    for (const one of head.split(",")) {
      const selector = one.trim();
      if (
        selector.startsWith(".schematic-") &&
        SHIPPED.test(selector) &&
        !ICON_FAMILY.test(selector) &&
        !UNREACHABLE.has(selector)
      ) {
        out.add(selector);
      }
    }
  }
  return Array.from(out).sort();
}

/**
 * Splits a selector on combinators, masking attribute values so a space
 * inside one is not read as a descendant step.
 */
function compounds(selector: string): string[] {
  return selector
    .replace(/\[[^\]]*\]/g, "[]")
    .split(/[\s>+~]+/)
    .filter((part) => part !== "");
}

function tree(
  node: React.ReactNode,
  data: BillingData,
  status?: never,
  actions?: React.ComponentProps<typeof BillingDataProvider>["actions"],
) {
  const { container } = render(
    <BillingDataProvider actions={actions} data={data} status={status}>
      {node}
    </BillingDataProvider>,
  );
  return container.firstElementChild as HTMLElement;
}

/** A default card expiring this month, judged against the real clock, so
 * the header warns of it. */
function expiringDefault() {
  const now = new Date();
  return cardPaymentMethod({
    isDefault: true,
    canRemove: false,
    cardExpMonth: now.getMonth() + 1,
    cardExpYear: now.getFullYear(),
  });
}

/** Opens the card's dialog and unfolds the other methods. Scoped to the
 * card: the other cards on the page offer the same actions. */
function unfold(root: HTMLElement) {
  fireEvent.click(
    root.querySelector(".schematic-payment-methods__edit") as Element,
  );
  fireEvent.click(
    root.querySelector(".schematic-payment-methods__choose") as Element,
  );
  return root;
}

/** The dialog with a write that has just failed at its foot. */
async function failedWrite() {
  const root = unfold(
    tree(
      <PaymentMethods locale="en-US" />,
      SCENARIOS.paymentMethods(),
      undefined,
      {
        setDefaultPaymentMethod: vi.fn().mockRejectedValue(new Error("Nope")),
      },
    ),
  );
  fireEvent.click(
    root.querySelector(".schematic-payment-methods__set-default") as Element,
  );
  await waitFor(() =>
    expect(
      root.querySelector(".schematic-payment-methods__error"),
    ).not.toBeNull(),
  );
  return root;
}

/** The dialog opened straight onto the form, whose place is held while it
 * loads. */
function adding() {
  const root = tree(
    <PaymentMethods locale="en-US" />,
    SCENARIOS.paymentMethodsEmpty(),
  );
  fireEvent.click(
    root.querySelector(".schematic-payment-methods__edit") as Element,
  );
  return root;
}

/** Every render that reaches a selector in the sheet. */
async function everyCard() {
  const noUrl = SCENARIOS.pro();
  noUrl.invoices = invoicePage([invoice({ url: null })]);
  const boom = new Error("Boom");
  // The default is expiring; a card is among the others, so a row shows an
  // expiry.
  const everyExpiry = () => ({
    paymentMethods: [
      expiringDefault(),
      ...paymentMethodSet().slice(1),
      cardPaymentMethod({ cardExpMonth: 1, cardExpYear: 2020 }),
    ],
  });

  return [
    tree(<PaymentMethods locale="en-US" />, everyExpiry()),
    unfold(tree(<PaymentMethods locale="en-US" />, everyExpiry())),
    tree(
      <PaymentMethods locale="en-US" />,
      SCENARIOS.paymentMethodsNoDefault(),
    ),
    tree(<PaymentMethods locale="en-US" />, SCENARIOS.paymentMethodsEmpty()),
    adding(),
    tree(<PaymentMethods locale="en-US" />, {}, {
      paymentMethods: { isPending: true },
    } as never),
    tree(<PaymentMethods locale="en-US" />, {}, {
      paymentMethods: { error: boom },
    } as never),
    tree(<PaymentMethods locale="en-US" />, SCENARIOS.paymentMethods(), {
      paymentMethods: { error: boom },
    } as never),
    await failedWrite(),
    tree(<Invoices limit={1} locale="en-US" />, SCENARIOS.pro()),
    tree(<Invoices collapsible={false} locale="en-US" />, SCENARIOS.pro()),
    tree(<Invoices locale="en-US" />, noUrl),
    tree(<Invoices locale="en-US" />, SCENARIOS.trialing()),
    tree(<Invoices locale="en-US" />, {}, {
      invoices: { isPending: true },
    } as never),
    tree(<Invoices locale="en-US" />, {}, {
      invoices: { error: boom },
    } as never),
    tree(<Invoices locale="en-US" />, SCENARIOS.pro(), {
      invoices: { error: boom },
    } as never),
    tree(<UpcomingBill locale="en-US" />, SCENARIOS.pro()),
    tree(<UpcomingBill locale="en-US" />, SCENARIOS.trialing()),
    tree(<UpcomingBill locale="en-US" />, SCENARIOS.unbilled()),
    tree(<UpcomingBill locale="en-US" />, {}, {
      upcomingInvoice: { isPending: true },
    } as never),
    tree(<UpcomingBill locale="en-US" />, {}, {
      upcomingInvoice: { error: boom },
    } as never),
    tree(<UpcomingBill locale="en-US" />, SCENARIOS.pro(), {
      upcomingInvoice: { error: boom },
    } as never),
  ];
}

describe("the packaged stylesheet", () => {
  test("every rule aimed at a shipped element still matches its markup", async () => {
    const cards = await everyCard();
    const unmatched = shippedSelectors().filter((selector) => {
      // Interaction states and pseudo-elements cannot be staged in a
      // render, and the expanded toggle is the collapsed one with its
      // attribute flipped — or the reverse, for a toggle staged open.
      const probe = selector
        .replace(/:not\(:disabled\)/g, "")
        .replace(/:(hover|focus-visible|disabled)/g, "")
        .replace(/::[a-z-]+/g, "")
        .replace(/\[aria-expanded="(true|false)"\]/, "");
      return !cards.some(
        (root) => root.matches(probe) || root.querySelector(probe) !== null,
      );
    });
    expect(unmatched).toEqual([]);
  });

  test("no rule aimed at a shipped element reaches for a tag or a position", () => {
    const reaching = shippedSelectors().filter((selector) =>
      compounds(selector).some((compound) => !compound.includes(".")),
    );
    expect(reaching).toEqual([]);
  });
});

/** A colour written out rather than taken from a token. */
const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\(|\bhsla?\(/;

/**
 * The sheet with every `var()` fallback removed. Walks the parens rather
 * than matching them, since fallbacks nest: `var(--x, light-dark(#fff, #000))`.
 */
function withoutFallbacks(css: string): string {
  let out = "";
  for (let i = 0; i < css.length; i += 1) {
    if (!css.startsWith("var(", i)) {
      out += css[i];
      continue;
    }
    let depth = 0;
    let cut = -1;
    let j = i + 3;
    for (; j < css.length; j += 1) {
      const c = css[j];
      if (c === "(") depth += 1;
      else if (c === ")") {
        depth -= 1;
        if (depth === 0) break;
      } else if (c === "," && depth === 1 && cut === -1) cut = j;
    }
    out += cut === -1 ? css.slice(i, j + 1) : `${css.slice(i, cut)})`;
    i = j;
  }
  return out;
}

describe("the palette", () => {
  test("reaches the rules as fallbacks, never as a declaration", () => {
    // See tokens.ts: a `:root` rule would beat a host's layered declarations.
    expect(schematicStylesCss).not.toMatch(/:root/);
    expect(schematicStylesCss.match(/var\(--schematic-[a-z-]+\)/g)).toBeNull();
  });

  test("no rule hard-codes a colour", () => {
    const rules = withoutFallbacks(schematicStylesCss);
    const offenders = rules
      .split("\n")
      .filter(
        (line) => COLOUR_LITERAL.test(line) && !line.trim().startsWith("*"),
      );
    expect(offenders).toEqual([]);
  });

  test("every colour token carries both themes", () => {
    const unthemed = Object.entries(SCHEMATIC_TOKENS)
      .filter(([, value]) => COLOUR_LITERAL.test(value))
      .filter(([, value]) => !value.includes("light-dark("))
      .map(([name]) => name);
    expect(unthemed).toEqual([]);
  });

  test("a token with no entry fails loudly rather than resolving to nothing", () => {
    expect(() =>
      withTokenDefaults("a { color: var(--schematic-nope); }"),
    ).toThrow(/Unknown Schematic token: --schematic-nope/);
  });

  test("a fallback already written by hand is left alone", () => {
    const css = "a { color: var(--schematic-text, red); }";
    expect(withTokenDefaults(css)).toBe(css);
  });
});
