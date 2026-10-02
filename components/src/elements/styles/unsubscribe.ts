export const unsubscribeCss = `
.schematic-unsubscribe {
  display: flex;
  justify-content: center;
}

.schematic-unsubscribe__open {
  width: 100%;
}

/* The reassurance on the left, what the subscription costs on the right. */
.schematic-unsubscribe__columns {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) * 2);
}

.schematic-unsubscribe__summary {
  display: flex;
  flex: 1 1 18rem;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 2);
}

.schematic-unsubscribe__manage {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-unsubscribe__manage-plan {
  align-self: flex-start;
}

.schematic-unsubscribe__sidebar {
  background: var(--schematic-surface);
  border-radius: calc(var(--schematic-radius) / 2);
  display: flex;
  flex: 1 1 16rem;
  flex-direction: column;
  gap: var(--schematic-space);
  padding: calc(var(--schematic-space) * 1.5);
}

.schematic-unsubscribe__group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-unsubscribe__line {
  align-items: baseline;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  white-space: nowrap;
}

.schematic-unsubscribe__name {
  font-family: var(--schematic-font-heading);
  font-weight: 700;
  white-space: normal;
}

.schematic-unsubscribe__total {
  border-top: 1px solid var(--schematic-card-divider);
  padding-top: var(--schematic-space);
}

.schematic-unsubscribe__confirm {
  width: 100%;
}
`;
