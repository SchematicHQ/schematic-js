import {
  BillingDataProvider,
  type BillingData,
} from "@schematichq/schematic-react";
import { render } from "@testing-library/react";

import { Invoices } from "../Invoices";
import { UpcomingBill } from "../UpcomingBill";
import { invoice, invoicePage } from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import { withTokenDefaults } from "./tokens";

import { SCHEMATIC_TOKENS, schematicStylesCss } from ".";

/**
 * The sheet and the markup are one contract in two files. A rule that no
 * longer matches anything is a rename that only got halfway, so every rule
 * aimed at a shipped element is checked against the element in every state.
 *
 * Rules for elements not yet shipped match nothing by definition and are
 * skipped.
 */
const SHIPPED =
  /schematic-(invoices|upcoming-bill|row|chip|small|card|header|status|skeleton|muted|error|link-button)/;

/**
 * The pending fallback for an element that passes no skeleton of its own.
 * Every shipped element passes one, so nothing here can match it.
 */
const UNREACHABLE = new Set([".schematic-skeleton:empty"]);

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

function tree(node: React.ReactNode, data: BillingData, status?: never) {
  const { container } = render(
    <BillingDataProvider data={data} status={status}>
      {node}
    </BillingDataProvider>,
  );
  return container.firstElementChild as HTMLElement;
}

/** Every render that reaches a selector in the sheet. */
function everyCard() {
  const noUrl = SCENARIOS.pro();
  noUrl.invoices = invoicePage([invoice({ url: null })]);
  const boom = new Error("Boom");

  return [
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
  test("every rule aimed at a shipped element still matches its markup", () => {
    const cards = everyCard();
    const unmatched = shippedSelectors().filter((selector) => {
      // Interaction states cannot be staged in a render, and the expanded
      // toggle is the collapsed one with its attribute flipped.
      const probe = selector
        .replace(/:(hover|focus-visible|disabled)/g, "")
        .replace('[aria-expanded="true"]', '[aria-expanded="false"]');
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
