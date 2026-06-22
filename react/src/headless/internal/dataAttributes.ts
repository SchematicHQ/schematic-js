// Conventions for the `data-schematic-*` attributes the headless parts emit.
//
// These are the styling/selection contract for consumers of the headless
// layer (analogous to Radix's `data-*` hooks). They are intentionally
// separate from the `data-schematic="…"` values the styled `/components`
// wrappers emit, which remain a concern of those wrappers.

/** The attribute every part stamps with its kebab-case part name. */
export const PART_ATTR = "data-schematic-part";

/**
 * Build the standard part attribute object. Spread onto the rendered element:
 *
 *   <Comp {...partAttrs("track")} />  →  data-schematic-part="track"
 */
export function partAttrs(part: string): { [PART_ATTR]: string } {
  return { [PART_ATTR]: part };
}

/**
 * The CSS custom property a meter fill exposes its 0–100 percent through. It
 * carries a value, not a width rule — consumers turn it into geometry, e.g.
 *
 *   [data-schematic-part="fill"] { width: calc(var(--schematic-usage-meter-percent) * 1%); }
 */
export const USAGE_METER_PERCENT_VAR = "--schematic-usage-meter-percent";
