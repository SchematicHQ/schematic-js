export const creditUsageCss = `
.schematic-credit-usage__credits {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

/* Each credit draws its own card, so the root draws one only while pending
   or failed. */
.schematic-credit-usage[data-state="pending"],
.schematic-credit-usage[data-state="error"] {
  background: var(--schematic-background);
  border-radius: var(--schematic-radius);
  box-shadow: var(--schematic-shadow);
  padding: calc(var(--schematic-card-padding) * 0.75)
    var(--schematic-card-padding);
}

.schematic-credit-usage__credit {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
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

/* The embed's spacing: the balance well clear of the name, the composition
   tucked close under the balance. */
.schematic-credit-usage__body {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: calc(var(--schematic-space) * 2);
  min-width: 0;
}

.schematic-credit-usage__composition {
  margin-top: calc(var(--schematic-space) * -1.5);
}

.schematic-credit-usage__title {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-credit-usage__name {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
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
  font-size: 1.0625rem;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
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

.schematic-credit-usage__details .schematic-chevron,
.schematic-credit-usage__see-all .schematic-chevron {
  margin-inline-start: -0.333rem;
}

/* Opens above its toggle, as in the embed. */
.schematic-credit-usage__grants {
  background: var(--schematic-inset);
  border-radius: calc(var(--schematic-radius) * 0.8);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.5rem;
  padding: calc(var(--schematic-space) * 1.5);
}

.schematic-credit-usage__grant-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Where the grant and its date do not fit on one line, the date wraps
   rather than overflowing the panel. */
.schematic-credit-usage__grant {
  display: flex;
  flex-wrap: wrap;
  gap: 0.25rem var(--schematic-space);
  justify-content: space-between;
}

.schematic-credit-usage__grant-text {
  flex: 1 1 12rem;
  min-width: 0;
  overflow-wrap: anywhere;
}

.schematic-credit-usage__grant-date {
  margin-inline-start: auto;
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
