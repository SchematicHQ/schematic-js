export const creditLogCss = `
.schematic-credit-log {
  display: flex;
  flex-direction: column;
}

.schematic-credit-log__list {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-credit-log__row {
  align-items: baseline;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-credit-log__what {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  min-width: 0;
}

.schematic-credit-log__amount {
  font-variant-numeric: tabular-nums;
  margin-inline-start: auto;
  text-align: end;
  white-space: nowrap;
}

.schematic-credit-log__amount--positive {
  color: var(--schematic-positive);
}

.schematic-credit-log__toggle {
  align-items: center;
  display: inline-flex;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-credit-log__toggle .schematic-chevron {
  margin-inline-start: -0.333rem;
}

.schematic-credit-log__scroll {
  container-type: inline-size;
  overflow-x: auto;
}

.schematic-credit-log__table {
  border-collapse: collapse;
  width: 100%;
}

.schematic-credit-log__heading {
  border-bottom: 1px solid var(--schematic-card-divider);
  color: var(--schematic-muted);
  font-weight: 500;
  padding: 0 var(--schematic-space) calc(var(--schematic-space) / 2) 0;
  text-align: start;
}

.schematic-credit-log__cell {
  padding: calc(var(--schematic-space) / 2) var(--schematic-space)
    calc(var(--schematic-space) / 2) 0;
  vertical-align: baseline;
}

/* A long name, such as a user named by an ID, is cut with an ellipsis rather
   than widening its column or wrapping its row. */
.schematic-credit-log__truncate {
  color: inherit;
  display: block;
  font-size: inherit;
  max-width: 8rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schematic-credit-log__action,
.schematic-credit-log__detail {
  overflow-wrap: anywhere;
}

.schematic-credit-log__heading.schematic-credit-log__amount-heading,
.schematic-credit-log__cell.schematic-credit-log__amount-cell {
  padding-inline-end: 0;
  text-align: end;
}

/* A narrow card stacks each row: what happened and the amount, then when,
   who and which credit beneath. */
@container (max-width: 30rem) {
  .schematic-credit-log__heading-row {
    display: none;
  }

  .schematic-credit-log__table-row {
    column-gap: 0.25em;
    display: grid;
    grid-template-areas:
      "activity activity activity amount"
      "date by credit credit";
    grid-template-columns: auto auto 1fr auto;
    padding: calc(var(--schematic-space) / 2) 0;
  }

  .schematic-credit-log__cell {
    display: block;
    padding: 0;
  }

  .schematic-credit-log__activity {
    grid-area: activity;
  }

  .schematic-credit-log__cell.schematic-credit-log__amount-cell {
    grid-area: amount;
    padding-inline-start: var(--schematic-space);
  }

  .schematic-credit-log__date,
  .schematic-credit-log__by,
  .schematic-credit-log__credit {
    font-size: 0.75rem;
  }

  .schematic-credit-log__date {
    grid-area: date;
  }

  .schematic-credit-log__by {
    grid-area: by;
  }

  .schematic-credit-log__credit {
    grid-area: credit;
  }

  .schematic-credit-log__by,
  .schematic-credit-log__credit {
    align-items: baseline;
    display: flex;
    gap: 0.25em;
    min-width: 0;
  }

  .schematic-credit-log__by::before,
  .schematic-credit-log__credit::before {
    content: "·";
  }

  .schematic-credit-log__by.schematic-credit-log__by--none {
    display: none;
  }
}

.schematic-credit-log__actions {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  margin-top: var(--schematic-space);
}

.schematic-credit-log__empty {
  margin: 0;
  padding: calc(var(--schematic-space) / 2) 0;
}

.schematic-credit-log .schematic-skeleton__cell[data-column="action"] {
  width: 9rem;
}

.schematic-credit-log .schematic-skeleton__cell[data-column="amount"] {
  width: 5rem;
}
`;
