export const usageControlsCss = `
.schematic-usage-controls {
  display: flex;
  flex-direction: column;
}

.schematic-usage-controls__add {
  align-self: flex-start;
  margin-top: calc(var(--schematic-space) * 1.25);
  white-space: nowrap;
}

.schematic-usage-controls__list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 1.25);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-usage-controls__row {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.schematic-usage-controls__top {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-usage-controls__what {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem calc(var(--schematic-space) / 2);
  min-width: 0;
}

.schematic-usage-controls__scope {
  font-weight: 500;
  overflow-wrap: anywhere;
}

.schematic-usage-controls__cap {
  font-variant-numeric: tabular-nums;
}

.schematic-usage-controls__end {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: var(--schematic-space);
}

/* About 18px, under the 22px title line, so a chip does not make its row taller. */
.schematic-usage-controls__status {
  line-height: 1;
  padding-block: 0.125rem;
  text-transform: none;
  white-space: nowrap;
}

.schematic-usage-controls__status--near {
  border-color: var(--schematic-warning);
  color: var(--schematic-text);
  background: color-mix(in srgb, var(--schematic-warning) 15%, transparent);
}

.schematic-usage-controls__status--reached {
  border-color: var(--schematic-danger);
  color: var(--schematic-text);
  background: color-mix(in srgb, var(--schematic-danger) 15%, transparent);
}

.schematic-usage-controls__empty {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: calc(var(--schematic-space) / 2) 0;
}

.schematic-usage-controls__empty-title,
.schematic-usage-controls__empty-note {
  margin: 0;
}

.schematic-usage-controls__dialog {
  width: min(32rem, calc(100vw - 2 * var(--schematic-space)));
}

.schematic-usage-controls__form {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 1.25);
  padding: 1.5rem;
}

.schematic-usage-controls__field {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}

.schematic-usage-controls__label {
  font-size: 0.875rem;
  font-weight: 600;
}

.schematic-usage-controls__toggle {
  align-self: flex-start;
  flex-wrap: wrap;
}

.schematic-usage-controls__toggle .schematic-toggle__option:disabled {
  color: var(--schematic-muted);
  cursor: not-allowed;
}

.schematic-usage-controls__input {
  background: var(--schematic-background);
  border: 1px solid var(--schematic-border);
  border-radius: calc(var(--schematic-radius) * 0.8);
  box-sizing: border-box;
  color: var(--schematic-text);
  font: inherit;
  padding: 0.5rem 0.75rem;
  width: 100%;
}

.schematic-usage-controls__input:focus-visible {
  border-color: var(--schematic-accent);
  outline: 2px solid var(--schematic-accent);
  outline-offset: 0;
}

.schematic-usage-controls__fixed {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  margin: 0;
}

.schematic-usage-controls__fixed-scope {
  font-weight: 600;
}

.schematic-usage-controls__preview,
.schematic-usage-controls__note,
.schematic-usage-controls__failure {
  margin: 0;
}

.schematic-usage-controls__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-usage-controls__actions-end {
  display: flex;
  gap: calc(var(--schematic-space) / 2);
  margin-inline-start: auto;
}

.schematic-usage-controls__remove {
  color: var(--schematic-danger);
}

.schematic-usage-controls__confirm {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-usage-controls__remove-yes {
  background: var(--schematic-danger);
  border-color: var(--schematic-danger);
}

.schematic-usage-controls .schematic-skeleton__cell[data-column="scope"] {
  width: 9rem;
}

.schematic-usage-controls .schematic-skeleton__cell[data-column="limit"] {
  width: 6rem;
}
`;
