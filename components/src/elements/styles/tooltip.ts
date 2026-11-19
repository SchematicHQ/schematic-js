export const tooltipCss = `
.schematic-tooltip {
  display: inline-block;
  position: relative;
  vertical-align: middle;
}

.schematic-tooltip__trigger {
  background: none;
  border: 0;
  color: var(--schematic-muted);
  cursor: help;
  font-size: 1.5rem;
  line-height: 0;
  margin-inline-start: 0.25rem;
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

.schematic-tooltip__content::before {
  background: inherit;
  border: inherit;
  border-left-color: transparent;
  border-radius: 0 0 1px;
  border-top-color: transparent;
  bottom: calc(-0.3125rem - 1px);
  content: "";
  height: 0.625rem;
  inset-inline-end: 0.5rem;
  position: absolute;
  transform: rotate(45deg);
  width: 0.625rem;
}

.schematic-tooltip[data-placement="bottom"] .schematic-tooltip__content {
  bottom: auto;
  top: calc(100% + 0.5rem);
}

.schematic-tooltip[data-placement="bottom"] .schematic-tooltip__content::before {
  border-color: inherit;
  border-bottom-color: transparent;
  border-radius: 1px 0 0;
  border-right-color: transparent;
  bottom: auto;
  top: calc(-0.3125rem - 1px);
}

.schematic-tooltip[data-align="start"] .schematic-tooltip__content {
  inset-inline-end: auto;
  inset-inline-start: 0;
}

.schematic-tooltip[data-align="start"] .schematic-tooltip__content::before {
  inset-inline-end: auto;
  inset-inline-start: 0.5rem;
}

.schematic-tooltip[data-align="center"] .schematic-tooltip__content {
  inset-inline: auto;
  left: 50%;
  transform: translateX(-50%);
}

.schematic-tooltip[data-align="center"] .schematic-tooltip__content::before {
  inset-inline: auto;
  left: calc(50% - 0.3125rem);
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
