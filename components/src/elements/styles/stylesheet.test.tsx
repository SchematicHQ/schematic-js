import {
  CompanyDataProvider,
  type CompanyData,
} from "@schematichq/schematic-react";
import { render } from "@testing-library/react";

import { Invoices } from "../Invoices";
import { invoice, invoicePage } from "../fixtures/builders";
import { SCENARIOS } from "../fixtures/scenarios";

import { withTokenDefaults } from "./tokens";

import { SCHEMATIC_TOKENS, schematicStylesCss } from ".";

/**
 * The sheet and the markup are one contract, written in two files. Every
 * node an element renders carries a class (elements/markup.test.tsx holds
 * that line), so the sheet has no reason to reach for a tag or a position —
 * and a rule that no longer matches anything is a rename that only got
 * halfway. This renders the element in every state and checks that each
 * rule aimed at it still lands.
 *
 * Only rules naming a shipped element or a class it uses are checked: the
 * sheet also carries styling for elements that land with the endpoints
 * feeding them, and those match nothing yet by definition.
 */
const SHIPPED =
  /schematic-(invoices|card|header|status|skeleton|chip|muted|small|error|link-button)/;

/**
 * The pending fallback for an element that passes no skeleton of its own.
 * Invoices passes one, so nothing here can match it.
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
 * The parts of a selector a combinator separates, with attribute values
 * masked so a space inside one is not read as a descendant step. Every part
 * has to name a class of its own: a bare `a` or `h2` names a node by what it
 * is, and a bare `:last-child` names it by where it sits, and both go stale
 * the moment the markup moves.
 */
function compounds(selector: string): string[] {
  return selector
    .replace(/\[[^\]]*\]/g, "[]")
    .split(/[\s>+~]+/)
    .filter((part) => part !== "");
}

function tree(node: React.ReactNode, data: CompanyData, status?: never) {
  const { container } = render(
    <CompanyDataProvider data={data} status={status}>
      {node}
    </CompanyDataProvider>,
  );
  return container.firstElementChild as HTMLElement;
}

/** Every state and branch the element can render. */
function everyCard() {
  const noUrl = SCENARIOS.pro();
  noUrl.invoices = invoicePage([invoice({ url: null })]);
  const statuses = SCENARIOS.pro();
  statuses.invoices = invoicePage([
    invoice({ status: "open" }),
    invoice({ status: "uncollectible" }),
  ]);
  const boom = new Error("Boom");

  return [
    tree(<Invoices limit={1} locale="en-US" showStatus />, SCENARIOS.pro()),
    tree(<Invoices locale="en-US" showStatus />, statuses),
    tree(<Invoices locale="en-US" />, noUrl),
    tree(<Invoices locale="en-US" />, SCENARIOS.trialing()),
    tree(<Invoices locale="en-US" showStatus />, {}, {
      invoices: { isPending: true },
    } as never),
    tree(<Invoices locale="en-US" />, {}, {
      invoices: { error: boom },
    } as never),
    tree(<Invoices locale="en-US" />, SCENARIOS.pro(), {
      invoices: { error: boom },
    } as never),
  ];
}

describe("the packaged stylesheet", () => {
  test("every rule aimed at a shipped element still matches its markup", () => {
    const cards = everyCard();
    const unmatched = shippedSelectors().filter((selector) => {
      // The states a rule reacts to cannot be staged in a render.
      const probe = selector.replace(/:(hover|focus-visible|disabled)/g, "");
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
 * The sheet with every `var()` fallback removed — what is left is what the
 * rules say on their own. Walks the parens rather than matching them, since
 * a fallback nests: `var(--x, light-dark(#fff, #000))`.
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
    // A `:root` rule would have to win a cascade; a host's own tokens do not
    // reliably beat one, because a declaration inside `@layer base` loses to
    // an unlayered rule whatever its specificity.
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
