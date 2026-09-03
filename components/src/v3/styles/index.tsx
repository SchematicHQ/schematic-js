import React from "react";

import { invoicesCss } from "./invoices";
import { withTokenDefaults } from "./tokens";

export { SCHEMATIC_TOKENS, schematicTokensCss } from "./tokens";

/**
 * The rules as authored: every colour goes through a token, and no token
 * carries its default here. `withTokenDefaults` supplies those below, so a
 * host's own value wins from wherever it is declared. See ./tokens.ts.
 */
const rulesCss = `
:where([class^="schematic-"]) {
  box-sizing: border-box;
  color: var(--schematic-text);
  font-family: var(--schematic-font-body);
  line-height: var(--schematic-line-height);
}

:where([class^="schematic-"]) *,
:where([class^="schematic-"]) *::before,
:where([class^="schematic-"]) *::after {
  box-sizing: inherit;
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

.schematic-status {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
}

.schematic-skeleton {
  animation: schematic-pulse 1.2s ease-in-out infinite;
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 0.75);
}

.schematic-skeleton:empty {
  background: var(--schematic-meter-track);
  border-radius: var(--schematic-radius);
  min-height: 6rem;
}

.schematic-skeleton__heading,
.schematic-skeleton__cell {
  background: var(--schematic-meter-track);
  border-radius: calc(var(--schematic-radius) / 2);
}

.schematic-skeleton__heading {
  height: 1.25rem;
  margin-bottom: calc(var(--schematic-space) * 0.75);
  width: 8rem;
}

.schematic-skeleton__row {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-skeleton__cell {
  height: 1rem;
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

.schematic-status-note {
  font-size: 0.875rem;
  margin-top: var(--schematic-space);
}

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
  background: color-mix(
    in srgb,
    var(--schematic-primary) 85%,
    var(--schematic-primary-contrast)
  );
  border-color: color-mix(
    in srgb,
    var(--schematic-primary) 85%,
    var(--schematic-primary-contrast)
  );
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

.schematic-notice {
  border: 1px solid var(--schematic-border);
  border-inline-start: 4px solid var(--schematic-accent);
  border-radius: var(--schematic-radius);
  padding: calc(var(--schematic-space) / 2) var(--schematic-space);
}

.schematic-notice--warning {
  border-inline-start-color: var(--schematic-warning);
}

.schematic-notice--danger {
  border-inline-start-color: var(--schematic-danger);
}

.schematic-notice a {
  color: var(--schematic-accent);
}

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
  line-height: var(--schematic-line-height);
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

.schematic-header {
  align-items: baseline;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  margin-bottom: var(--schematic-space);
}

.schematic-header__title {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: var(--schematic-line-height-heading);
  margin: 0 0 calc(var(--schematic-space) / 2);
}

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
  text-align: end;
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
  padding: 0.125rem 0.85rem;
}

.schematic-chip {
  border: 1px solid var(--schematic-border);
  border-radius: 0.3125rem;
  font-size: 0.75rem;
  padding: 0.1875rem 0.375rem;
  text-transform: uppercase;
}

.schematic-pricing-table {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 2);
}

.schematic-pricing-table__controls {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  margin-inline-start: auto;
}

.schematic-pricing-table__plans {
  display: grid;
  gap: var(--schematic-space);
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
}

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
  line-height: var(--schematic-line-height-heading);
}

.schematic-plan-card__price sub {
  font-family: var(--schematic-font-body);
  font-size: 0.875rem;
  font-weight: 400;
  vertical-align: baseline;
}

.schematic-plan-card__badge {
  position: absolute;
  inset-inline-end: var(--schematic-space);
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

${invoicesCss}
`;

/**
 * The stylesheet `<SchematicStyles />` injects: the rules above with every
 * token's default inlined as a `var()` fallback.
 */
export const schematicStylesCss = withTokenDefaults(rulesCss);

/**
 * Injects the default v3 stylesheet. Render once, anywhere above the
 * elements; omit it to style the class names yourself.
 */
export const SchematicStyles: React.FC = () => (
  <style data-schematic-styles="">{schematicStylesCss}</style>
);
