/**
 * `Tooltip` and the pricing-tiers table it holds, shared by the usage
 * elements.
 */
export const tooltipCss = `
.schematic-tooltip {
  display: inline-block;
  margin-inline-start: 0.25rem;
  position: relative;
  vertical-align: middle;
}

.schematic-tooltip__trigger {
  background: none;
  border: 0;
  color: var(--schematic-muted);
  cursor: help;
  /* A button keeps the browser's control font; the glyph is the embed's
     24px. */
  font-size: 1.5rem;
  line-height: 0;
  padding: 0;
}

.schematic-tooltip__trigger:focus-visible {
  outline: 2px solid var(--schematic-accent);
  outline-offset: 2px;
}

.schematic-tooltip__content {
  background: var(--schematic-background);
  border: 1px solid var(--schematic-border);
  border-radius: calc(var(--schematic-radius) / 2);
  bottom: calc(100% + 0.5rem);
  box-shadow: var(--schematic-shadow);
  color: var(--schematic-text);
  font-size: 0.875rem;
  inset-inline-end: 0;
  padding: 0.5rem 0.75rem;
  pointer-events: none;
  position: absolute;
  text-align: start;
  visibility: hidden;
  white-space: nowrap;
  z-index: 1;
}

.schematic-tooltip:hover .schematic-tooltip__content,
.schematic-tooltip:focus-within .schematic-tooltip__content {
  visibility: visible;
}

.schematic-tiers {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-tiers__list {
  margin: 0;
}

.schematic-tiers__tier {
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  padding: 0.25rem 0;
}

.schematic-tiers__price {
  margin: 0;
}

.schematic-tiers__mode {
  border-top: 1px solid var(--schematic-border);
  padding-top: 0.5rem;
  white-space: normal;
}
`;
