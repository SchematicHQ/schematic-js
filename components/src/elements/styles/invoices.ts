export const invoicesCss = `
.schematic-invoices {
  display: flex;
  flex-direction: column;
}

.schematic-invoices__table {
  border-collapse: collapse;
  width: 100%;
}

.schematic-invoices__column {
  border-bottom: 1px solid var(--schematic-border);
  color: var(--schematic-muted);
  font-size: 0.875rem;
  font-weight: 500;
  padding-bottom: calc(var(--schematic-space) / 2);
}

.schematic-invoices__cell {
  border-top: 1px solid var(--schematic-border);
  padding: calc(var(--schematic-space) / 2) 0;
  vertical-align: middle;
}

.schematic-invoices__row:first-child .schematic-invoices__cell {
  border-top: none;
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
  font-variant-numeric: tabular-nums;
  text-align: end;
}

.schematic-invoices__credit {
  color: var(--schematic-muted);
  cursor: help;
}

.schematic-invoices__status {
  padding-inline-start: var(--schematic-space);
  text-align: end;
  white-space: nowrap;
}

.schematic-invoices__actions {
  display: flex;
  gap: var(--schematic-space);
  margin-top: var(--schematic-space);
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

.schematic-invoices .schematic-skeleton__cell[data-column="status"] {
  border-radius: 9999px;
  height: 1.25rem;
  width: 4rem;
}
`;
