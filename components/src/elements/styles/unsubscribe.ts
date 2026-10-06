export const unsubscribeCss = `
.schematic-unsubscribe {
  display: flex;
  justify-content: center;
}

.schematic-unsubscribe__open {
  width: 100%;
}

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

/* A ghost button in the link colour, as the embed's. */
.schematic-unsubscribe__manage-plan {
  align-self: flex-start;
  color: var(--schematic-accent);
}

.schematic-unsubscribe__sidebar {
  background: var(--schematic-inset);
  border-radius: calc(var(--schematic-radius) * 0.8);
  display: flex;
  flex: 1 1 16rem;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 1.5);
  padding: calc(var(--schematic-space) * 1.5);
}

/* A label sits tight over its lines, as in the embed. */
.schematic-unsubscribe__group {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
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
  font-size: 1.125rem;
  font-weight: 800;
  white-space: normal;
}

.schematic-unsubscribe__total {
  border-top: 1px solid var(--schematic-card-divider);
  padding-top: calc(var(--schematic-space) * 1.5);
}

.schematic-unsubscribe__confirm {
  width: 100%;
}
`;
