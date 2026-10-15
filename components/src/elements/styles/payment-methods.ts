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

.schematic-payment-methods__expiry-warning {
  color: var(--schematic-danger);
  white-space: nowrap;
}

.schematic-payment-methods__current {
  align-items: center;
  background: var(--schematic-surface);
  border-radius: 9999px;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  padding: calc(var(--schematic-space) / 2.25) var(--schematic-space);
}

.schematic-payment-methods__method {
  align-items: center;
  display: inline-flex;
  flex-grow: 1;
  gap: 0.25em;
  min-width: 0;
}

.schematic-payment-methods__label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.schematic-payment-methods__icon {
  color: currentColor;
  flex-shrink: 0;
  font-size: 1.5em;
  margin-inline-end: calc(var(--schematic-space) / 4);
}

.schematic-payment-methods__last4 {
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.schematic-payment-methods__empty {
  flex-grow: 1;
}

.schematic-payment-methods__edit,
.schematic-payment-methods__remove-current {
  flex-shrink: 0;
  white-space: nowrap;
}

.schematic-payment-methods__choose {
  align-items: center;
  align-self: flex-start;
  display: inline-flex;
  text-align: start;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-payment-methods__choose:hover {
  text-decoration: none;
}

.schematic-payment-methods__choose:hover .schematic-payment-methods__choose-label {
  text-decoration: underline;
}

.schematic-payment-methods__dialog .schematic-dialog__body {
  background: color-mix(in srgb, var(--schematic-text) 2.5%, transparent);
  gap: calc(var(--schematic-space) * 2);
  padding: var(--schematic-space);
}

@media (min-width: 768px) {
  .schematic-payment-methods__dialog .schematic-dialog__body {
    padding: calc(var(--schematic-space) * 2) calc(var(--schematic-space) * 2.5);
  }
}

.schematic-payment-methods__dialog .schematic-payment-methods__list,
.schematic-payment-methods__dialog .schematic-payment-methods__current,
.schematic-payment-methods__dialog .schematic-payment-methods__error {
  margin-top: calc(var(--schematic-space) * -1);
}

.schematic-payment-methods__list {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-payment-methods__row {
  align-items: center;
  border-bottom: 1px solid var(--schematic-card-divider);
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2) var(--schematic-space);
  padding: calc(var(--schematic-space) / 2) 0;
}

.schematic-payment-methods__row .schematic-payment-methods__method {
  flex: 1 1 10rem;
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
.schematic-payment-methods__edit:disabled,
.schematic-payment-methods__remove-current:disabled {
  color: var(--schematic-muted);
  cursor: not-allowed;
  text-decoration: none;
}

.schematic-payment-methods__remove {
  background: none;
  border: none;
  border-radius: 9999px;
  color: color-mix(in srgb, var(--schematic-text) 27.5%, transparent);
  cursor: pointer;
  display: inline-flex;
  font-size: 1.75rem;
  line-height: 1;
  padding: 0;
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

.schematic-payment-methods__add-new {
  border-radius: 0.625rem;
  font-size: 1.1875rem;
  min-height: 4rem;
  padding: 0.5625rem 1.75rem;
}

.schematic-payment-methods__select-existing {
  align-self: flex-start;
}

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
  gap: calc(var(--schematic-space) * 1.5);
}

.schematic-payment-methods__address {
  margin-bottom: calc(var(--schematic-space) * 2);
}

.schematic-payment-methods__field {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 0.75);
}

.schematic-payment-methods__input {
  background: var(--schematic-background);
  border: 1px solid var(--schematic-border);
  border-radius: calc(var(--schematic-radius) * 0.8);
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
