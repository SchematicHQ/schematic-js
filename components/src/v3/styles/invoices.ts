/** Invoices: a two- or three-column history table in a card. */
export const invoicesCss = `
/* ---------- Invoices ---------- */
.schematic-invoices {
  display: flex;
  flex-direction: column;
}

.schematic-invoices__table {
  border-collapse: collapse;
  width: 100%;
}

.schematic-invoices__table td {
  border-top: 1px solid var(--schematic-border);
  padding: calc(var(--schematic-space) / 2) 0;
  vertical-align: middle;
}

.schematic-invoices__table tr:first-child td {
  border-top: none;
}

.schematic-invoices__date a {
  color: var(--schematic-accent);
  text-decoration: none;
}

.schematic-invoices__date a:hover {
  text-decoration: underline;
}

.schematic-invoices__amount {
  font-variant-numeric: tabular-nums;
  text-align: right;
}

.schematic-invoices__credit {
  color: var(--schematic-muted);
  cursor: help;
}

.schematic-invoices__status {
  padding-left: var(--schematic-space);
  text-align: right;
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
`;
