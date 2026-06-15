// Conventions for the `data-schematic-*` attributes the headless parts emit.
//
// These are the styling/selection contract for consumers of the composable
// layer (analogous to Radix's `data-*` hooks). They are intentionally
// separate from the `data-testid="sch-*"` values, which remain a concern of
// the styled `/components` wrappers and are NOT emitted here.

/** The attribute every part stamps with its kebab-case part name. */
export const PART_ATTR = "data-schematic-part";

/**
 * Build the standard part attribute object. Spread onto the rendered element:
 *
 *   <Comp {...partAttrs("plan")} />  →  data-schematic-part="plan"
 */
export function partAttrs(part: string): { [PART_ATTR]: string } {
  return { [PART_ATTR]: part };
}

/** Map a boolean to the `"active" | "inactive"` convention used by toggles. */
export function activeState(active: boolean): "active" | "inactive" {
  return active ? "active" : "inactive";
}
