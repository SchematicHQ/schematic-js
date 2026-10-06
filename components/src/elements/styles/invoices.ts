export const invoicesCss = `
.schematic-invoices {
  display: flex;
  flex-direction: column;
}

.schematic-invoices__list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-invoices__row {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-invoices__date {
  text-align: start;
}

.schematic-invoices__link {
  color: var(--schematic-accent);
  font-family: var(--schematic-font-link);
  text-decoration: none;
}

.schematic-invoices__link:hover {
  text-decoration: underline;
}

.schematic-invoices__amount {
  cursor: help;
  font-variant-numeric: tabular-nums;
  /* Keeps a lone amount at the end when the date is hidden. */
  margin-inline-start: auto;
  text-align: end;
}

.schematic-invoices__actions {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  margin-top: var(--schematic-space);
}

.schematic-invoices__see-more {
  align-items: center;
  display: inline-flex;
  gap: calc(var(--schematic-space) / 2);
}

/* Cancels the glyph's side bearing, so the chevron sits flush. */
.schematic-invoices__chevron {
  margin-inline-start: -0.333rem;
}

.schematic-invoices__empty {
  padding: calc(var(--schematic-space) / 2) 0;
}

.schematic-invoices .schematic-skeleton__cell[data-column="date"] {
  width: 7rem;
}

.schematic-invoices .schematic-skeleton__cell[data-column="amount"] {
  width: 4rem;
}
`;
