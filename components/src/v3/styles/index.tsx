import iconFontCss from "@schematichq/schematic-icons/styles.css";
import React from "react";

import { includedFeaturesCss } from "./includedFeatures";
import { meteredFeaturesCss } from "./meteredFeatures";
import { planManagerCss } from "./planManager";

/**
 * The v3 elements style themselves through CSS custom properties on plain
 * semantic markup — no styled-components, no theme provider. Override any
 * `--schematic-*` variable on `:root` or on an ancestor of the elements to
 * theme them, or skip `<SchematicStyles />` and bring your own stylesheet
 * against the `.schematic-*` class names.
 *
 * Fonts are referenced, never loaded: load "Manrope" and "Public Sans" in
 * the host (or override `--schematic-font-heading` / `--schematic-font-body`)
 * and the system-ui fallback applies otherwise.
 */
export const schematicStylesCss = `
/*
 * Tokens are declared on :root at zero specificity so the elements INHERIT
 * them: a declaration on :root, body, or any ancestor overrides a default.
 * Declaring them on the elements themselves would beat inherited overrides
 * regardless of specificity.
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
  box-sizing: border-box;
  color: var(--schematic-text);
  font-family: var(--schematic-font-body);
}

:where([class^="schematic-"]) *,
:where([class^="schematic-"]) *::before,
:where([class^="schematic-"]) *::after {
  box-sizing: inherit;
}

:where([class^="schematic-"]) h2,
:where([class^="schematic-"]) h3 {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  margin: 0 0 calc(var(--schematic-space) / 2);
}

:where([class^="schematic-"]) p {
  margin: 0;
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

.schematic-small {
  font-size: 0.875rem;
}

.schematic-visually-hidden {
  clip: rect(0 0 0 0);
  clip-path: inset(50%);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}

/* Status frame */
.schematic-status {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
}

.schematic-skeleton {
  animation: schematic-pulse 1.2s ease-in-out infinite;
  background: var(--schematic-meter-track);
  border-radius: var(--schematic-radius);
  min-height: 6rem;
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

/* Filled call to action, shared by buttons and links. */
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

.schematic-cta:focus-visible,
.schematic-link-button:focus-visible {
  outline: 2px solid var(--schematic-accent);
  outline-offset: 2px;
}

.schematic-cta:disabled {
  background: var(--schematic-meter-track);
  border-color: var(--schematic-meter-track);
  color: var(--schematic-muted);
  cursor: not-allowed;
}

/* Outline variant, used for downgrades. */
.schematic-cta--outline {
  background: transparent;
  color: var(--schematic-text);
}

.schematic-cta--outline:hover:not(:disabled) {
  background: color-mix(in srgb, var(--schematic-primary) 10%, transparent);
  border-color: var(--schematic-primary);
}

.schematic-cta--small {
  font-size: 0.9375rem;
  min-height: 2.5rem;
  padding: 0.375rem 1rem;
}

/* Inline text-style action ("Show all", "Retry", "Load more"). */
.schematic-link-button {
  background: none;
  border: none;
  color: var(--schematic-accent);
  cursor: pointer;
  font-family: var(--schematic-font-body);
  font-size: 1rem;
  padding: 0;
}

.schematic-link-button:hover {
  text-decoration: underline;
}

/* Feature icons: the icon font in a rounded neutral chip. */
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

.schematic-icon--bare {
  background: none;
  font-size: 1.25rem;
  height: auto;
  width: auto;
}

/* Meter */
.schematic-meter {
  background: var(--schematic-meter-track);
  border-radius: 9999px;
  height: 0.5rem;
  overflow: hidden;
  width: 100%;
}

.schematic-meter__fill {
  background: var(--schematic-accent);
  border-radius: 9999px;
  height: 100%;
}

.schematic-meter--warning .schematic-meter__fill {
  background: var(--schematic-warning);
}

.schematic-meter--over .schematic-meter__fill {
  background: var(--schematic-danger);
}

/* Two-column key/value row. */
.schematic-row {
  align-items: baseline;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  padding: calc(var(--schematic-space) / 4) 0;
}

.schematic-row > :last-child {
  text-align: right;
}

/* Notice: a bordered callout under a card's header. */
.schematic-notice {
  border: 1px solid var(--schematic-border);
  border-left: 4px solid var(--schematic-accent);
  border-radius: var(--schematic-radius);
  padding: calc(var(--schematic-space) / 2) var(--schematic-space);
}

.schematic-notice--warning {
  border-left-color: var(--schematic-warning);
}

.schematic-notice--danger {
  border-left-color: var(--schematic-danger);
}

.schematic-notice a {
  color: var(--schematic-accent);
}

/* Pill toggle (period selector). */
.schematic-toggle {
  border: 1px solid var(--schematic-border);
  border-radius: 2.5rem;
  display: inline-flex;
}

.schematic-toggle button {
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

.schematic-toggle button[aria-pressed="true"] {
  background: var(--schematic-border);
  font-weight: 600;
}

.schematic-select {
  background: var(--schematic-background);
  border: 1px solid var(--schematic-border);
  border-radius: 0.5rem;
  color: var(--schematic-text);
  font-family: var(--schematic-font-body);
  padding: 0.375rem 0.625rem;
}

/* Header row shared by the list elements. */
.schematic-header {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  margin-bottom: var(--schematic-space);
}

.schematic-header h2,
.schematic-header h3 {
  margin: 0;
}

/* Feature row shared by IncludedFeatures, MeteredFeatures, CreditUsage. */
.schematic-feature-list {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-feature {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-feature__row {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
}

.schematic-feature__name {
  flex-grow: 1;
  font-weight: 500;
}

.schematic-feature__detail {
  text-align: right;
}

.schematic-feature__description {
  color: var(--schematic-muted);
  font-size: 0.875rem;
}

.schematic-feature__actions {
  display: flex;
  justify-content: flex-end;
}

.schematic-badge {
  background: var(--schematic-primary);
  border-radius: 9999px;
  color: var(--schematic-primary-contrast);
  display: inline-block;
  font-size: 0.75rem;
  line-height: 1.5;
  padding: 0.125rem 0.85rem;
}

.schematic-chip {
  border: 1px solid var(--schematic-border);
  border-radius: 0.3125rem;
  font-size: 0.75rem;
  padding: 0.1875rem 0.375rem;
  text-transform: uppercase;
}

/* ---------- PricingTable ---------- */
.schematic-pricing-table {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 2);
}

.schematic-pricing-table__controls {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  margin-left: auto;
}

.schematic-pricing-table__plans {
  display: grid;
  gap: var(--schematic-space);
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

/*
 * Plan cards pad vertically at the card and horizontally per section so
 * the header divider spans the card edge to edge.
 */
.schematic-plan-card {
  display: flex;
  flex-direction: column;
  padding: var(--schematic-card-padding) 0;
  position: relative;
}

.schematic-plan-card--active {
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
  align-items: center;
  display: flex;
  font-size: 1.8125rem;
  font-weight: 800;
  gap: 0.5rem;
  margin: 0;
}

.schematic-plan-card__description {
  min-height: 1.5em;
}

.schematic-plan-card__price {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-weight: 800;
}

.schematic-plan-card__price sub {
  font-family: var(--schematic-font-body);
  font-size: 0.875rem;
  font-weight: 400;
  vertical-align: baseline;
}

.schematic-plan-card__badge {
  position: absolute;
  right: var(--schematic-space);
  top: var(--schematic-space);
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

.schematic-plan-card__entitlements {
  display: flex;
  flex-direction: column;
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

.schematic-plan-card__current {
  align-items: center;
  display: flex;
  gap: 0.25rem;
  justify-content: center;
  padding: 0.625rem 0;
}

.schematic-plan-card__action {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-plan-card .schematic-cta {
  width: 100%;
}

${includedFeaturesCss}
${meteredFeaturesCss}
${planManagerCss}

/*
 * The schematic-icons icon font (inlined from the package's styles.css): the
 * @font-face plus one content class per icon name, rendered by <Icon />.
 */
${iconFontCss}
`;

/**
 * Injects the default v3 stylesheet. Render once, anywhere above the
 * elements; omit it to style the class names yourself.
 */
export const SchematicStyles: React.FC = () => (
  <style data-schematic-styles="">{schematicStylesCss}</style>
);
