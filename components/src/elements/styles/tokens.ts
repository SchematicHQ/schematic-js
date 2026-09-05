/**
 * The `--schematic-*` palette, and the machinery that puts it into the
 * stylesheet as fallbacks rather than as declarations.
 *
 * Nothing here emits a `:root` block. A `:root` rule has to win a cascade to
 * take effect, and a host's own tokens do not reliably beat it: declarations
 * inside a cascade layer — `@layer base { :root { … } }`, which Tailwind v4
 * encourages — lose to an unlayered rule no matter how specific they are,
 * because layer order is resolved before specificity. The default would
 * silently outrank the host's theme with no way to see why.
 *
 * A `var()` fallback is not a declaration, so it never enters the cascade at
 * all. It applies only when the property is set nowhere, which means a host
 * setting `--schematic-background` wins from any layer, any specificity, any
 * ancestor. That is the whole reason the defaults live here as strings
 * instead of in a rule.
 */

/**
 * A colour that follows the theme, resolved against the inherited
 * `color-scheme`. That is the contract: a host that declares
 * `color-scheme: dark` — directly, or on the class its theme switcher
 * toggles — gets the dark value with nothing else to configure.
 */
const ld = (light: string, dark: string): string =>
  `light-dark(${light}, ${dark})`;

/**
 * Every token the stylesheet can reference, with the value used when the
 * host sets none. Adding a token here is what makes it usable in the CSS;
 * `stylesheet.test.tsx` fails on a `var(--schematic-…)` with no entry.
 */
export const SCHEMATIC_TOKENS: Record<string, string> = {
  "--schematic-accent": ld("#194bfb", "#6f92ff"),
  "--schematic-accent-contrast": ld("#ffffff", "#0a0a0a"),
  "--schematic-background": ld("#ffffff", "#0e0e0e"),
  "--schematic-border": ld(
    "hsla(0, 0%, 0%, 0.125)",
    "hsla(0, 0%, 100%, 0.145)",
  ),
  "--schematic-card-divider": ld(
    "hsla(0, 0%, 0%, 0.175)",
    "hsla(0, 0%, 100%, 0.2)",
  ),
  "--schematic-card-padding": "2.8125rem",
  "--schematic-danger": ld("#d75a5c", "#ff6b6e"),
  "--schematic-font-body": '"Public Sans", system-ui, sans-serif',
  "--schematic-font-heading": '"Manrope", system-ui, sans-serif',
  "--schematic-line-height": "1.5",
  "--schematic-line-height-heading": "1.2",
  "--schematic-meter-track": ld("#f2f4f7", "#26282d"),
  "--schematic-muted": ld("#8a8a8a", "#a1a1a1"),
  "--schematic-primary": ld("#000000", "#ffffff"),
  "--schematic-primary-contrast": ld("#ffffff", "#000000"),
  "--schematic-radius": "0.625rem",
  // `light-dark()` resolves a colour, not a whole value, so the shadow
  // themes through the colour slots of the two layers it is built from.
  "--schematic-shadow": `0px 1px 20px 0px ${ld("#1018280f", "#00000099")}, 0px 1px 3px 0px ${ld("#1018281a", "#0000007a")}`,
  "--schematic-space": "1rem",
  "--schematic-text": ld("#000000", "#ffffff"),
  "--schematic-warning": ld("#ffaa06", "#ffbb3d"),
};

/** A `var(--schematic-…)` with no fallback of its own. */
const BARE_TOKEN = /var\((--schematic-[a-z-]+)\)/g;

/**
 * Gives every token reference in `css` its default, so the sheet carries the
 * palette without declaring it anywhere. Written this way round — plain
 * `var(--schematic-x)` in the rules, defaults injected here — so no rule can
 * be authored that quietly misses one.
 *
 * Throws on a token with no entry above: a typo would otherwise render as a
 * property that resolves to nothing, which is invisible until someone looks
 * at the page.
 */
export function withTokenDefaults(css: string): string {
  return css.replace(BARE_TOKEN, (_match, name: string) => {
    const fallback = SCHEMATIC_TOKENS[name];
    if (fallback === undefined) {
      throw new Error(`Unknown Schematic token: ${name}`);
    }
    return `var(${name}, ${fallback})`;
  });
}

/**
 * The palette as a `:root` block, for a host that wants to read
 * `--schematic-*` from its own CSS. Not part of `<SchematicStyles />` — it
 * is a rule, so it carries the cascade problem the fallbacks avoid, and a
 * host that opts in should place it where its own tokens can beat it.
 */
export const schematicTokensCss = `:root {
${Object.entries(SCHEMATIC_TOKENS)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join("\n")}
}
`;
