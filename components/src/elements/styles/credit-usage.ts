export const creditUsageCss = `
.schematic-credit-usage__credits {
  display: flex;
  flex-direction: column;
}

/* A credit is a section of the one card, divided from the next. */
.schematic-credit-usage__credit {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  padding: calc(var(--schematic-space) * 1.5) 0;
}

.schematic-credit-usage__credit + .schematic-credit-usage__credit {
  border-top: 1px solid var(--schematic-card-divider);
}

.schematic-credit-usage__credit:first-child {
  padding-top: 0;
}

.schematic-credit-usage__credit:last-child {
  padding-bottom: 0;
}

.schematic-credit-usage__main {
  display: flex;
  gap: calc(var(--schematic-space) * 1.5);
}

/* Held even without a glyph, as the embed does, so names line up. */
.schematic-credit-usage__icon {
  align-items: center;
  background: var(--schematic-surface);
  border-radius: 9999px;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 1.5rem;
  height: 2.75rem;
  justify-content: center;
  width: 2.75rem;
}

.schematic-credit-usage__icon .schematic-icon {
  color: var(--schematic-accent);
}

.schematic-credit-usage__body {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: var(--schematic-space);
  min-width: 0;
}

.schematic-credit-usage__title {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-credit-usage__name {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 800;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

.schematic-credit-usage__balance {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-credit-usage__remaining {
  font-family: var(--schematic-font-heading);
  font-size: 1.125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
}

.schematic-credit-usage__buy-more {
  white-space: nowrap;
}

.schematic-credit-usage__details,
.schematic-credit-usage__see-all {
  align-items: center;
  display: inline-flex;
  gap: 0.25rem;
}

.schematic-credit-usage__grants {
  background: var(--schematic-surface);
  border-radius: calc(var(--schematic-radius) / 2);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0.5rem;
  padding: var(--schematic-space);
}

.schematic-credit-usage__grant-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-credit-usage__grant {
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-credit-usage__grant-date {
  text-align: end;
  white-space: nowrap;
}

.schematic-credit-usage .schematic-skeleton__cell[data-column="name"] {
  width: 10rem;
}

.schematic-credit-usage .schematic-skeleton__cell[data-column="remaining"] {
  width: 6rem;
}
`;
