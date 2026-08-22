/**
 * IncludedFeatures: the shared feature-row classes do most of the work; these
 * rules stack the right column and mark expired or inaccessible rows.
 */
export const includedFeaturesCss = `
.schematic-included-features {
  display: flex;
  flex-direction: column;
}

.schematic-included-features .schematic-feature__name {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.schematic-included-features__title {
  font-weight: 500;
}

.schematic-included-features .schematic-feature__detail {
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  gap: 0.125rem;
}

.schematic-included-features__allocation {
  font-weight: 500;
}

.schematic-included-features__expiration {
  font-style: italic;
}

.schematic-included-features__feature--no-access {
  opacity: 0.6;
}

.schematic-included-features__empty {
  font-size: 0.875rem;
}

.schematic-included-features__show-all {
  align-self: flex-start;
  margin-top: var(--schematic-space);
}
`;
