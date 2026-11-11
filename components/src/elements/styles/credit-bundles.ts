export const creditBundlesCss = `
.schematic-credit-bundles {
  display: flex;
  flex-direction: column;
}

.schematic-credit-bundles__list {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-credit-bundles__row {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-credit-bundles__what {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.schematic-credit-bundles__name,
.schematic-credit-bundles__detail {
  overflow-wrap: anywhere;
}

.schematic-credit-bundles__buy {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.schematic-credit-bundles__empty {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  padding: calc(var(--schematic-space) / 2) 0;
}

.schematic-credit-bundles__empty-title,
.schematic-credit-bundles__empty-note {
  margin: 0;
}

.schematic-credit-bundles .schematic-skeleton__cell[data-column="name"] {
  width: 9rem;
}

.schematic-credit-bundles .schematic-skeleton__cell[data-column="buy"] {
  width: 5rem;
}
`;
