export const upcomingBillCss = `
.schematic-upcoming-bill {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-upcoming-bill .schematic-header {
  margin-bottom: 0;
}

.schematic-upcoming-bill .schematic-header__title {
  margin-bottom: 0;
}

.schematic-upcoming-bill__amount {
  align-items: flex-start;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-upcoming-bill__total {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
  line-height: 1;
}

.schematic-upcoming-bill__estimate {
  font-weight: 600;
  max-width: 10rem;
  text-align: end;
}

.schematic-upcoming-bill__rows {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-upcoming-bill .schematic-row__value {
  font-variant-numeric: tabular-nums;
}

.schematic-upcoming-bill__discounts {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
  list-style: none;
  margin: 0;
  padding: 0;
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
