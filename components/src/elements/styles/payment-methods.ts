export const paymentMethodsCss = `
.schematic-payment-methods {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-payment-methods .schematic-header {
  align-items: center;
  margin-bottom: 0;
}

.schematic-payment-methods .schematic-header__title {
  margin-bottom: 0;
}

/* Keeps a lone Add at the end when the heading is hidden. */
.schematic-payment-methods__add {
  margin-inline-start: auto;
}

.schematic-payment-methods__list {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* The name on the left, the expiry and actions on the right; a narrow card
   wraps the actions under the name. */
.schematic-payment-methods__row {
  align-items: center;
  border-top: 1px solid var(--schematic-card-divider);
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2) var(--schematic-space);
  padding: calc(var(--schematic-space) * 0.75) 0;
}

.schematic-payment-methods__row:first-child {
  border-top: 0;
  padding-top: 0;
}

.schematic-payment-methods__row:last-child {
  padding-bottom: 0;
}

.schematic-payment-methods__method {
  align-items: center;
  display: inline-flex;
  flex-grow: 1;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-payment-methods__brand {
  font-weight: 500;
}

.schematic-payment-methods__last4 {
  font-variant-numeric: tabular-nums;
}

.schematic-payment-methods__expires {
  color: var(--schematic-muted);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.schematic-payment-methods__expires[data-expiry="soon"] {
  color: var(--schematic-warning);
}

.schematic-payment-methods__expires[data-expiry="expired"] {
  color: var(--schematic-danger);
}

.schematic-payment-methods__actions {
  align-items: center;
  display: inline-flex;
  gap: var(--schematic-space);
  white-space: nowrap;
}

.schematic-payment-methods__actions .schematic-link-button:disabled {
  color: var(--schematic-muted);
  cursor: not-allowed;
  text-decoration: none;
}

.schematic-payment-methods__empty {
  padding: calc(var(--schematic-space) / 2) 0;
}

/* The failed write and its retry sit on one line beneath the list. */
.schematic-payment-methods__write-error {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  margin-top: 0;
}

.schematic-payment-methods__write-retry {
  flex-shrink: 0;
  white-space: nowrap;
}

.schematic-payment-methods__form {
  border-top: 1px solid var(--schematic-card-divider);
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  padding-top: var(--schematic-space);
}

.schematic-payment-methods__form-actions {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
}

.schematic-payment-methods .schematic-skeleton__cell[data-column="method"] {
  width: 10rem;
}

.schematic-payment-methods .schematic-skeleton__cell[data-column="actions"] {
  width: 6rem;
}

.schematic-payment-methods .schematic-skeleton__cell[data-column="field"] {
  height: 3rem;
  width: 100%;
}
`;
