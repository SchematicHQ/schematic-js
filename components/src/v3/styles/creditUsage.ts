/** CreditUsage: one card per credit, on the shared feature-row classes. */
export const creditUsageCss = `
/* ---------- CreditUsage ---------- */
.schematic-credit-usage__credits {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-credit-usage__credit {
  gap: var(--schematic-space);
}

.schematic-credit-usage__name {
  font-size: 1.125rem;
  margin: 0;
}

.schematic-credit-usage__usage {
  color: var(--schematic-muted);
  font-size: 0.875rem;
  white-space: nowrap;
}

.schematic-credit-usage__credit--warning .schematic-credit-usage__usage {
  color: var(--schematic-warning);
}

.schematic-credit-usage__credit--over .schematic-credit-usage__usage {
  color: var(--schematic-danger);
}

.schematic-credit-usage__summary {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2) var(--schematic-space);
  justify-content: space-between;
}

/* The ledger disclosure: a link-styled summary with no marker. */
.schematic-credit-usage__ledger summary {
  list-style: none;
  width: fit-content;
}

.schematic-credit-usage__ledger summary::-webkit-details-marker {
  display: none;
}

.schematic-credit-usage__grants {
  border-top: 1px solid var(--schematic-border);
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
  list-style: none;
  margin: var(--schematic-space) 0 0;
  padding: var(--schematic-space) 0 0;
}

.schematic-credit-usage__grant {
  display: flex;
  flex-direction: column;
  font-size: 0.9375rem;
  gap: 0.125rem;
}

.schematic-credit-usage__show-all {
  margin-top: var(--schematic-space);
}

.schematic-credit-usage__buy {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-credit-usage__bundles {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2) var(--schematic-space);
  justify-content: flex-end;
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-credit-usage__empty {
  padding: calc(var(--schematic-space) / 2) 0;
}
`;
