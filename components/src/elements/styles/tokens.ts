/**
 * The `--schematic-*` palette, emitted as `var()` fallbacks rather than a
 * `:root` block. A host's own tokens are often declared inside a cascade
 * layer (Tailwind v4's `@layer base`), and a layered declaration loses to an
 * unlayered one regardless of specificity, so a `:root` default would
 * silently override the host's theme. A fallback never enters the cascade.
 */

/** A host that sets `color-scheme: dark` gets the dark value with no config. */
const ld = (light: string, dark: string): string =>
  `light-dark(${light}, ${dark})`;

/**
 * Every token the stylesheet can reference, with the value used when the
 * host sets none. Adding a token here is what makes it usable in the CSS;
 * `withTokenDefaults` throws on any other.
 */
export const SCHEMATIC_TOKENS: Record<string, string> = {
  "--schematic-accent": ld("#194bfb", "#6f92ff"),
  "--schematic-accent-contrast": ld("#ffffff", "#0a0a0a"),
  "--schematic-backdrop": ld("hsla(0, 0%, 0%, 0.5)", "hsla(0, 0%, 0%, 0.7)"),
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
  // The embed's link face: Edit, Set default, Try again, and the rest.
  "--schematic-font-link": '"Inter", system-ui, sans-serif',
  "--schematic-line-height": "1.5",
  "--schematic-line-height-heading": "1.2",
  "--schematic-meter-track": ld("#f2f4f7", "#26282d"),
  "--schematic-muted": ld("#8a8a8a", "#a1a1a1"),
  "--schematic-primary": ld("#000000", "#ffffff"),
  "--schematic-primary-contrast": ld("#ffffff", "#000000"),
  "--schematic-radius": "0.625rem",
  // `light-dark()` takes colours only, so it is applied per shadow layer.
  "--schematic-shadow": `0px 1px 20px 0px ${ld("#1018280f", "#00000099")}, 0px 1px 3px 0px ${ld("#1018281a", "#0000007a")}`,
  "--schematic-space": "1rem",
  // A tint over the background: the payment method pill.
  "--schematic-surface": ld(
    "hsla(0, 0%, 0%, 0.0625)",
    "hsla(0, 0%, 100%, 0.125)",
  ),
  "--schematic-text": ld("#000000", "#ffffff"),
  "--schematic-warning": ld("#ffaa06", "#ffbb3d"),
};

/** A `var(--schematic-…)` with no fallback of its own. Token names are
 * lowercase letters and hyphens. */
const BARE_TOKEN = /var\((--schematic-[a-z-]+)\)/g;

/**
 * Rules are written with bare `var(--schematic-x)` and defaults are injected
 * here, so no rule can quietly miss one. Throws on an unknown token, which
 * would otherwise resolve to nothing and only show up visually.
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
 * Opt-in and separate from `<SchematicStyles />`: as a rule it has the
 * cascade problem the fallbacks avoid.
 */
export const schematicTokensCss = `:root {
${Object.entries(SCHEMATIC_TOKENS)
  .map(([name, value]) => `  ${name}: ${value};`)
  .join("\n")}
}
`;
