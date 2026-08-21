/**
 * MeteredFeatures: one card per metered feature, laid out with the shared
 * feature-row and meter classes plus a price footer.
 */
export const meteredFeaturesCss = `
.schematic-metered-features {
  display: flex;
  flex-direction: column;
}

.schematic-metered-features__cards {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-metered-features__card {
  gap: var(--schematic-space);
  padding: calc(var(--schematic-card-padding) * 0.5)
    calc(var(--schematic-card-padding) * 0.75);
}

.schematic-metered-features .schematic-feature__name {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.schematic-metered-features__title {
  font-weight: 500;
}

.schematic-metered-features .schematic-feature__detail {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 0.125rem;
}

.schematic-metered-features__usage {
  font-family: var(--schematic-font-heading);
  font-size: 1.125rem;
  font-weight: 600;
}

.schematic-metered-features__meter {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
}

.schematic-metered-features__meter-text {
  flex-shrink: 0;
  white-space: nowrap;
}

.schematic-metered-features__price {
  border-top: 1px solid var(--schematic-border);
  padding-top: calc(var(--schematic-space) / 2);
}

.schematic-metered-features__tiers {
  display: block;
  margin-top: 0.25rem;
}
`;
