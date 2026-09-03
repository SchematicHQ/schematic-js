export const upcomingBillCss = `
.schematic-upcoming-bill {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-upcoming-bill .schematic-header {
  margin-bottom: 0;
}

.schematic-upcoming-bill__amount {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-upcoming-bill__total {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: var(--schematic-line-height-heading);
}

.schematic-upcoming-bill__rows {
  border-top: 1px solid var(--schematic-border);
  display: flex;
  flex-direction: column;
  padding-top: calc(var(--schematic-space) / 2);
}

.schematic-upcoming-bill .schematic-row__value {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.schematic-upcoming-bill__discount {
  align-items: center;
  display: inline-flex;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-upcoming-bill__empty {
  padding: calc(var(--schematic-space) / 2) 0;
}

.schematic-upcoming-bill .schematic-skeleton__cell[data-column="amount"] {
  height: 1.8125rem;
  width: 7rem;
}

.schematic-upcoming-bill .schematic-skeleton__cell[data-column="row"] {
  width: 12rem;
}
`;
