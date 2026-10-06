export const meteredFeaturesCss = `
.schematic-metered-features__list {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  list-style: none;
  margin: 0;
  padding: 0;
}

/* Each feature is a card; while pending or failed, the root is the card. */
.schematic-metered-features[data-state="pending"],
.schematic-metered-features[data-state="error"] {
  background: var(--schematic-background);
  border-radius: var(--schematic-radius);
  box-shadow: var(--schematic-shadow);
  padding: calc(var(--schematic-card-padding) * 0.75)
    var(--schematic-card-padding);
}

.schematic-metered-features__feature {
  container-type: inline-size;
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 1.5);
  overflow: hidden;
}

.schematic-metered-features__main {
  display: flex;
  gap: calc(var(--schematic-space) * 1.5);
}

/* Kept without a glyph, as in the embed, so names line up. */
.schematic-metered-features__icon {
  align-items: center;
  background: var(--schematic-surface);
  border-radius: 9999px;
  color: var(--schematic-accent);
  display: inline-flex;
  flex-shrink: 0;
  font-size: 1.5rem;
  height: 2.75rem;
  justify-content: center;
  width: 2.75rem;
}

/* The glyph takes the base text colour rather than inheriting, so the accent
   is set on it too. */
.schematic-metered-features__icon .schematic-icon {
  color: var(--schematic-accent);
}

.schematic-metered-features__body {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: calc(var(--schematic-space) * 2);
  min-width: 0;
}

.schematic-metered-features__top {
  display: flex;
  flex-wrap: wrap;
  gap: var(--schematic-space);
}

.schematic-metered-features__title {
  display: flex;
  flex: 1 1 min-content;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-metered-features__name {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-weight: 800;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

/* Beside the title when both fit, otherwise beneath it as in the embed,
   rather than wrapping in a narrow column. */
.schematic-metered-features__figures {
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  gap: 0.25rem;
  max-width: 100%;
  text-align: end;
}

.schematic-metered-features__headline {
  font-size: 1.0625rem;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  white-space: nowrap;
}

@container (max-width: 30rem) {
  .schematic-metered-features__figures {
    min-width: 0;
    text-align: start;
  }

  /* Too narrow to keep "1,300 GB of storage used" on one line. */
  .schematic-metered-features__headline {
    white-space: normal;
  }
}

.schematic-metered-features__limit {
  font-variant-numeric: tabular-nums;
}

.schematic-metered-features__add-more {
  align-self: flex-start;
  white-space: nowrap;
}

/* Negative margins undo the card's padding so the footer bleeds to its edges. */
.schematic-metered-features__price-details {
  align-items: center;
  background: var(--schematic-surface);
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  margin: 0 calc(var(--schematic-card-padding) * -1)
    calc(var(--schematic-card-padding) * -0.75);
  padding: calc(var(--schematic-card-padding) * 0.4375)
    var(--schematic-card-padding);
}

.schematic-metered-features .schematic-skeleton__cell[data-column="name"] {
  width: 10rem;
}

.schematic-metered-features .schematic-skeleton__cell[data-column="usage"] {
  width: 6rem;
}

.schematic-metered-features__meter {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
}

.schematic-metered-features__meter .schematic-meter {
  flex-grow: 1;
  min-width: 6rem;
}

.schematic-meter--tier {
  background: color-mix(in srgb, var(--schematic-accent) 50%, transparent);
}

/* Past the soft limit, the fill is the included share over a warning track. */
.schematic-meter--overage {
  background: var(--schematic-warning);
}

.schematic-metered-features__meter-label {
  font-size: 0.875rem;
  font-variant-numeric: tabular-nums;
  font-weight: 500;
  white-space: nowrap;
}

.schematic-usage-by-user {
  align-items: flex-start;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.schematic-usage-by-user__title {
  font-family: var(--schematic-font-heading);
  font-size: 1.125rem;
  font-weight: 800;
}

.schematic-usage-by-user__list {
  align-self: stretch;
  list-style: none;
  margin: 0.5rem 0 0;
  padding: 0;
}

.schematic-usage-by-user__user {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  padding: 0.5rem 0;
}

.schematic-usage-by-user__avatar {
  align-items: center;
  background: var(--schematic-surface);
  border-radius: 9999px;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 0.6875rem;
  font-weight: 500;
  height: 1.75rem;
  justify-content: center;
  width: 1.75rem;
}

.schematic-usage-by-user__name {
  flex-grow: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schematic-usage-by-user__amount {
  text-align: end;
}

.schematic-usage-by-user__toggle {
  align-items: center;
  display: inline-flex;
  gap: 0.25rem;
}

.schematic-usage-by-user__toggle .schematic-chevron {
  margin-inline-start: -0.333rem;
}
`;
