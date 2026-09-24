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

.schematic-payment-methods__expiry-warning {
  color: var(--schematic-danger);
  white-space: nowrap;
}

/* The pill: the default method on the left, Edit or Add on the right. */
.schematic-payment-methods__current {
  align-items: center;
  background: var(--schematic-surface);
  border-radius: 9999px;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  padding: calc(var(--schematic-space) * 0.5) var(--schematic-space);
}

.schematic-payment-methods__method {
  align-items: center;
  display: inline-flex;
  flex-grow: 1;
  flex-wrap: wrap;
  gap: 0.25em;
}

/* The brand's mark before the label, in the label's colour. */
.schematic-payment-methods__icon {
  color: currentColor;
  flex-shrink: 0;
  font-size: 1.25em;
  margin-inline-end: calc(var(--schematic-space) / 4);
}

.schematic-payment-methods__last4 {
  font-variant-numeric: tabular-nums;
}

.schematic-payment-methods__empty {
  flex-grow: 1;
}

.schematic-payment-methods__edit {
  flex-shrink: 0;
  white-space: nowrap;
}

/* The toggle that reveals the other methods, with its chevron: down while
   folded, up while unfolded, each its own glyph. */
.schematic-payment-methods__choose {
  align-items: center;
  align-self: flex-start;
  display: inline-flex;
  gap: calc(var(--schematic-space) / 4);
}

.schematic-payment-methods__chevron {
  font-size: 1em;
}

.schematic-payment-methods__list {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
}

/* The name on the left, the expiry and actions on the right; a narrow
   dialog wraps the actions under the name. */
.schematic-payment-methods__row {
  align-items: center;
  border-bottom: 1px solid var(--schematic-card-divider);
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2) var(--schematic-space);
  padding: calc(var(--schematic-space) / 2) 0;
}

.schematic-payment-methods__expires {
  flex-grow: 1;
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.schematic-payment-methods__set-default {
  white-space: nowrap;
}

.schematic-payment-methods__set-default:disabled,
.schematic-payment-methods__edit:disabled {
  color: var(--schematic-muted);
  cursor: not-allowed;
  text-decoration: none;
}

.schematic-payment-methods__remove {
  background: none;
  border: none;
  border-radius: 9999px;
  color: var(--schematic-muted);
  cursor: pointer;
  font-size: 0.875rem;
  line-height: 1;
  padding: 0.25rem;
}

.schematic-payment-methods__remove:hover:not(:disabled) {
  color: var(--schematic-text);
}

.schematic-payment-methods__remove:focus-visible {
  outline: 2px solid var(--schematic-accent);
  outline-offset: 2px;
}

.schematic-payment-methods__remove:disabled {
  cursor: not-allowed;
}

.schematic-payment-methods__add-new,
.schematic-payment-methods__save {
  width: 100%;
}

.schematic-payment-methods__select-existing {
  align-self: flex-start;
}

/* The failed write and its retry sit on one line at the foot of the dialog. */
.schematic-payment-methods__error {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  margin-top: 0;
}

.schematic-payment-methods__error-retry {
  flex-shrink: 0;
  white-space: nowrap;
}

.schematic-payment-methods__form {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

/* The fields the checkout settings add beside Stripe's own. */
.schematic-payment-methods__field {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-payment-methods__input {
  background: var(--schematic-background);
  border: 1px solid var(--schematic-border);
  border-radius: var(--schematic-radius);
  box-sizing: border-box;
  color: var(--schematic-text);
  font: inherit;
  padding: 0.75rem;
  width: 100%;
}

.schematic-payment-methods__input:focus-visible {
  border-color: var(--schematic-accent);
  outline: 2px solid var(--schematic-accent);
  outline-offset: 0;
}

.schematic-payment-methods .schematic-skeleton__cell[data-column="method"] {
  width: 10rem;
}

.schematic-payment-methods .schematic-skeleton__cell[data-column="action"] {
  width: 3rem;
}

.schematic-payment-methods .schematic-skeleton__cell[data-column="field"] {
  height: 3rem;
  width: 100%;
}
`;
