export const includedFeaturesCss = `
.schematic-included-features {
  container-type: inline-size;
}

.schematic-included-features__list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 1.5);
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Icon, name and details; the usage drops beneath on a narrow card. */
.schematic-included-features__row {
  column-gap: 0.5rem;
  display: grid;
  grid-template-columns: min-content 1fr;
}

/* Two classes: the icon font's own rule comes later in the sheet and sets
   display, which would leave the glyph in the circle's corner. */
.schematic-included-features .schematic-included-features__icon {
  align-items: center;
  background: var(--schematic-surface);
  border-radius: 9999px;
  color: var(--schematic-accent);
  display: inline-flex;
  font-size: 1.5rem;
  height: 2.75rem;
  justify-content: center;
  margin-inline-end: 0.5rem;
  width: 2.75rem;
}

.schematic-included-features__details {
  align-self: baseline;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  grid-column: 2;
}

.schematic-included-features__name {
  font-family: var(--schematic-font-heading);
  font-weight: 700;
}

.schematic-included-features__usage {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  grid-column: 1 / span 2;
  margin-inline-start: 3.75rem;
  margin-top: 0.75rem;
}

.schematic-included-features__entitlement,
.schematic-included-features__used {
  font-variant-numeric: tabular-nums;
}

@container (min-width: 30rem) {
  .schematic-included-features__row {
    grid-template-columns: min-content 3fr 2fr;
  }

  .schematic-included-features__usage {
    align-self: baseline;
    grid-column: 3;
    margin-inline-start: 0;
    margin-top: 0;
    text-align: end;
  }
}

.schematic-included-features__toggle {
  align-items: center;
  display: inline-flex;
  gap: 0.25rem;
  margin-top: var(--schematic-space);
}

.schematic-included-features .schematic-skeleton__cell[data-column="name"] {
  width: 10rem;
}

.schematic-included-features .schematic-skeleton__cell[data-column="usage"] {
  width: 6rem;
}
`;
