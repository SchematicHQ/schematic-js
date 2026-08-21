/** UpcomingBill: the estimated amount with its balance and discount rows. */
export const upcomingBillCss = `
/* ---------- UpcomingBill ---------- */
.schematic-upcoming-bill {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-upcoming-bill .schematic-header {
  margin-bottom: 0;
}

.schematic-upcoming-bill__amount {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-upcoming-bill__total {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-weight: 800;
}

.schematic-upcoming-bill__rows {
  border-top: 1px solid var(--schematic-border);
  display: flex;
  flex-direction: column;
  padding-top: calc(var(--schematic-space) / 2);
}

.schematic-upcoming-bill__discount {
  align-items: center;
  display: inline-flex;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-upcoming-bill__contract-end {
  font-size: 0.875rem;
}

.schematic-upcoming-bill__empty {
  padding: calc(var(--schematic-space) / 2) 0;
}
`;
