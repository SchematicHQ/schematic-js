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
  text-decoration: none;
}

.schematic-invoices__link:hover {
  text-decoration: underline;
}

.schematic-invoices__amount {
  cursor: help;
  font-variant-numeric: tabular-nums;
  /* Keeps a lone amount at the end when the date is hidden: with one child,
     space-between has nothing to space. */
  margin-inline-start: auto;
  text-align: end;
}

.schematic-invoices__credit {
  color: var(--schematic-muted);
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
  gap: 0.375rem;
}

/* A chevron drawn from two borders, pointing down; up once expanded. The
   vertical nudge rides in the transform with the rotation, so one
   transitioned property carries both and the icon does not hop. */
.schematic-invoices__chevron {
  border-block-end: 2px solid var(--schematic-muted);
  border-inline-end: 2px solid var(--schematic-muted);
  display: inline-block;
  height: 0.5em;
  transform: translateY(-0.125em) rotate(45deg);
  transition: transform 0.15s;
  width: 0.5em;
}

.schematic-invoices__see-more[aria-expanded="true"] .schematic-invoices__chevron {
  transform: translateY(0.125em) rotate(-135deg);
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
