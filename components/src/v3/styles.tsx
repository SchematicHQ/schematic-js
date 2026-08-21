import iconFontCss from "@schematichq/schematic-icons/styles.css";
import React from "react";

/**
 * The v3 elements style themselves through CSS custom properties on plain
 * semantic markup — no styled-components, no theme provider. Override any
 * --schematic-* variable (globally or per element subtree) to theme them,
 * or skip <SchematicStyles /> entirely and bring your own stylesheet
 * against the .schematic-* class names.
 *
 * The default design ports the v2 embed look: Manrope headings, Public
 * Sans body, shadowed white cards, black filled CTAs, pill meters. The
 * fonts are referenced but NOT loaded here — load "Manrope" and
 * "Public Sans" in the host app (e.g. next/font or a Google Fonts link),
 * or override --schematic-font-heading / --schematic-font-body; the
 * system-ui fallback applies otherwise.
 */
export const schematicStylesCss = `
/*
 * Tokens live on :root (zero specificity via :where) so the elements
 * INHERIT them — any author declaration on :root, body, or an ancestor of
 * the elements overrides a default. Declaring them on the elements
 * themselves would beat inherited overrides regardless of specificity.
 */
:where(:root) {
  --schematic-accent: #194bfb;
  --schematic-accent-contrast: #ffffff;
  --schematic-background: #ffffff;
  --schematic-border: hsla(0, 0%, 0%, 0.125);
  --schematic-card-divider: hsla(0, 0%, 0%, 0.175);
  --schematic-card-padding: 2.8125rem;
  --schematic-danger: #d75a5c;
  --schematic-font-body: "Public Sans", system-ui, sans-serif;
  --schematic-font-heading: "Manrope", system-ui, sans-serif;
  --schematic-meter-track: #f2f4f7;
  --schematic-muted: #8a8a8a;
  --schematic-primary: #000000;
  --schematic-primary-contrast: #ffffff;
  --schematic-radius: 0.625rem;
  --schematic-shadow: 0px 1px 20px 0px #1018280f, 0px 1px 3px 0px #1018281a;
  --schematic-space: 1rem;
  --schematic-text: #000000;
  --schematic-warning: #ffaa06;
}

:where([class^="schematic-"]) {
  color: var(--schematic-text);
  font-family: var(--schematic-font-body);
}

:where([class^="schematic-"]) h3 {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 calc(var(--schematic-space) / 2);
}

.schematic-card {
  background: var(--schematic-background);
  border-radius: var(--schematic-radius);
  box-shadow: var(--schematic-shadow);
  color: var(--schematic-text);
  padding: calc(var(--schematic-card-padding) * 0.75)
    var(--schematic-card-padding);
}

.schematic-muted {
  color: var(--schematic-muted);
}

.schematic-skeleton {
  animation: schematic-pulse 1.2s ease-in-out infinite;
  min-height: 2.5rem;
}

@keyframes schematic-pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

@media (prefers-reduced-motion: reduce) {
  .schematic-skeleton {
    animation: none;
  }
}

.schematic-error {
  color: var(--schematic-danger);
}

/* Filled call-to-action, shared by buttons and CTA links. */
.schematic-cta {
  align-items: center;
  background: var(--schematic-primary);
  border: 1px solid var(--schematic-primary);
  border-radius: 0.5rem;
  color: var(--schematic-primary-contrast);
  cursor: pointer;
  display: inline-flex;
  font-family: var(--schematic-font-body);
  font-size: 1.0625rem;
  font-weight: 500;
  justify-content: center;
  line-height: 1;
  min-height: 3.25rem;
  padding: 0.5rem 1.5rem;
  text-decoration: none;
  transition: background-color 0.1s, border-color 0.1s;
}

.schematic-cta:hover:not(:disabled) {
  background: color-mix(in srgb, var(--schematic-primary) 85%, #ffffff);
  border-color: color-mix(in srgb, var(--schematic-primary) 85%, #ffffff);
}

.schematic-cta:focus-visible {
  outline: 2px solid var(--schematic-primary);
  outline-offset: 2px;
}

.schematic-cta:disabled {
  background: var(--schematic-meter-track);
  border-color: var(--schematic-meter-track);
  color: var(--schematic-muted);
  cursor: not-allowed;
}

/* Inline text-style action ("Show all", "Show less"). */
.schematic-link-button {
  align-self: flex-start;
  background: none;
  border: none;
  color: var(--schematic-accent);
  cursor: pointer;
  font-family: var(--schematic-font-body);
  font-size: 1rem;
  margin-top: calc(var(--schematic-space) / 2);
  padding: 0;
}

.schematic-link-button:hover {
  text-decoration: underline;
}

/* Feature icons: the v2 icon font in a rounded neutral chip. */
.schematic-icon {
  align-items: center;
  background: color-mix(
    in oklch,
    var(--schematic-background) 87.5%,
    var(--schematic-text)
  );
  border-radius: 9999px;
  color: var(--schematic-primary);
  display: inline-flex;
  flex-shrink: 0;
  font-size: 1.5rem;
  font-style: normal;
  height: 2.75rem;
  justify-content: center;
  line-height: 1;
  width: 2.75rem;
}

.schematic-pricing-table {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 2);
}

.schematic-pricing-table__header {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  margin-bottom: var(--schematic-space);
}

.schematic-pricing-table__header h3 {
  margin: 0;
}

.schematic-pricing-table__controls {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

.schematic-pricing-table__toggle {
  border: 1px solid var(--schematic-border);
  border-radius: 2.5rem;
  display: inline-flex;
}

.schematic-pricing-table__toggle button {
  background: none;
  border: none;
  border-radius: 2.5rem;
  color: var(--schematic-text);
  cursor: pointer;
  font-family: var(--schematic-font-body);
  font-size: 0.9375rem;
  font-weight: 400;
  margin: -1px;
  padding: 0.4375rem 1.25rem;
  white-space: nowrap;
}

.schematic-pricing-table__toggle button[aria-pressed="true"] {
  background: var(--schematic-border);
  font-weight: 600;
}

.schematic-pricing-table select {
  background: var(--schematic-background);
  border: 1px solid var(--schematic-border);
  border-radius: 0.5rem;
  color: var(--schematic-text);
  font-family: var(--schematic-font-body);
  padding: 0.375rem 0.625rem;
}

.schematic-pricing-table__plans {
  display: grid;
  gap: var(--schematic-space);
  grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
}

/*
 * Plan cards pad vertically at the card and horizontally per section so
 * the header's divider spans the card edge-to-edge, as in the v2 embed.
 */
.schematic-plan-card {
  display: flex;
  flex-direction: column;
  padding: var(--schematic-card-padding) 0;
  position: relative;
}

/* The company's current plan gets the v2 active outline. */
.schematic-plan-card:has(.schematic-plan-card__badge) {
  outline: 2px solid var(--schematic-primary);
}

.schematic-plan-card__header {
  border-bottom: 1px solid var(--schematic-card-divider);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 var(--schematic-card-padding)
    calc(var(--schematic-card-padding) * 0.75);
}

.schematic-plan-card__header h3 {
  font-size: 1.8125rem;
  font-weight: 800;
  margin: 0;
}

.schematic-plan-card__header p {
  margin: 0 0 calc(var(--schematic-space) / 2);
}

.schematic-plan-card__body {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: var(--schematic-card-padding);
  justify-content: end;
  padding: calc(var(--schematic-card-padding) * 0.75)
    var(--schematic-card-padding) 0;
}

.schematic-plan-card__price {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-weight: 800;
}

/* Muted period suffix used outside the pricing table (e.g. PlanManager). */
.schematic-plan-card__price .schematic-muted {
  font-family: var(--schematic-font-body);
  font-size: 0.875rem;
  font-weight: 400;
}

.schematic-plan-card__badge {
  background: var(--schematic-primary);
  border-radius: 9999px;
  color: var(--schematic-primary-contrast);
  font-size: 0.75rem;
  padding: 0.125rem 0.85rem;
  position: absolute;
  right: var(--schematic-space);
  top: var(--schematic-space);
}

.schematic-plan-card__entitlements {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: var(--schematic-space);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-plan-card__entitlements li {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
}

.schematic-plan-card__inclusion {
  margin-bottom: calc(var(--schematic-space) / 2);
}

.schematic-plan-card__detail {
  display: block;
  font-size: 0.875rem;
}

.schematic-plan-card__show-all {
  margin-top: var(--schematic-space);
}

.schematic-plan-card__show-all .schematic-icon {
  background: none;
  color: #d0d0d0;
  font-size: 1.125rem;
  height: auto;
  width: auto;
}

.schematic-plan-card__show-all .schematic-link-button {
  color: var(--schematic-accent);
  font-size: 1rem;
  margin: 0 0 0 0.5rem;
}

/* Replaces the call to action on the company's current plan. */
.schematic-plan-card__current {
  align-items: center;
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  padding: 0.625rem 0;
}

.schematic-plan-card__current .schematic-icon {
  background: none;
  font-size: 1.25rem;
  height: auto;
  width: auto;
}

.schematic-plan-card__current span {
  font-size: 0.9375rem;
}

.schematic-plan-card .schematic-cta {
  width: 100%;
}

/* Downgrade call to action, mirroring the v2 outline button variant. */
.schematic-cta--outline {
  background: transparent;
  color: var(--schematic-text);
}

.schematic-cta--outline:hover:not(:disabled) {
  background: color-mix(in srgb, var(--schematic-primary) 10%, transparent);
  border-color: var(--schematic-primary);
}

.schematic-meter {
  margin-bottom: var(--schematic-space);
}

.schematic-meter__bar {
  background: var(--schematic-meter-track);
  border-radius: 9999px;
  height: 0.5rem;
  overflow: hidden;
}

.schematic-meter__fill {
  background: var(--schematic-accent);
  border-radius: 9999px;
  height: 100%;
}

.schematic-meter--warning .schematic-meter__fill {
  background: var(--schematic-warning);
}

.schematic-meter--over_limit .schematic-meter__fill {
  background: var(--schematic-danger);
}

.schematic-meter__labels {
  display: flex;
  font-size: 0.875rem;
  font-weight: 500;
  justify-content: space-between;
  margin-bottom: calc(var(--schematic-space) / 4);
}

.schematic-invoices table {
  border-collapse: collapse;
  width: 100%;
}

.schematic-invoices td,
.schematic-invoices th {
  border-top: 1px solid var(--schematic-border);
  padding: calc(var(--schematic-space) / 2);
  text-align: left;
}

.schematic-invoices thead th {
  border-top: none;
  color: var(--schematic-muted);
  font-size: 0.875rem;
  font-weight: 500;
}

.schematic-invoices td:last-child,
.schematic-invoices th:last-child {
  text-align: right;
}

.schematic-invoices a {
  color: var(--schematic-accent);
  text-decoration: none;
}

.schematic-invoices a:hover {
  text-decoration: underline;
}

.schematic-row {
  display: flex;
  justify-content: space-between;
  padding: calc(var(--schematic-space) / 4) 0;
}

.schematic-notice {
  border: 1px solid var(--schematic-border);
  border-left: 4px solid var(--schematic-accent);
  border-radius: var(--schematic-radius);
  margin-top: var(--schematic-space);
  padding: calc(var(--schematic-space) / 2) var(--schematic-space);
}

.schematic-credit-usage details {
  margin-top: calc(var(--schematic-space) / 2);
}

.schematic-credit-usage summary {
  cursor: pointer;
}

/*
 * The schematic-icons icon font (inlined from the package's styles.css):
 * the @font-face plus one content class per icon name. Feature and plan
 * icons render as <i class="schematic-icon icon-{name}"> against these.
 */
${iconFontCss}
`;

/**
 * Injects the default v3 stylesheet. Render once, anywhere above the
 * elements; omit it to style the class names yourself.
 */
export const SchematicStyles: React.FC = () => {
  return <style>{schematicStylesCss}</style>;
};
