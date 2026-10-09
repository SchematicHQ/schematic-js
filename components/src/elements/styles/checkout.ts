/**
 * A checkout that keeps its columns: every one but `display.layout:
 * "stacked"`, which carries the modifier.
 */
const columns = ".schematic-checkout:not(.schematic-checkout--stacked)";

/**
 * `<Checkout />`: a wide dialog with the steps and their choices on the left
 * and the summary, totals and action on the right; stacked on a narrow one,
 * or on every width when the host asks.
 */
export const checkoutCss = `
.schematic-checkout.schematic-dialog {
  max-width: 72rem;
}

.schematic-checkout .schematic-dialog__body {
  gap: 0;
  padding: 0;
}

.schematic-checkout__layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
}

/* Side by side, the header and the summary stay put and each column scrolls
   on its own, so the total and the action are in view on every step. Stacked,
   the whole dialog scrolls. */
@media (min-width: 768px) {
  ${columns}.schematic-dialog[open] {
    display: flex;
    flex-direction: column;
    overflow: hidden;
  }

  ${columns} .schematic-dialog__body,
  ${columns} .schematic-checkout__frame {
    flex: 1;
    min-height: 0;
  }

  ${columns} .schematic-checkout__frame {
    display: flex;
    flex-direction: column;
  }

  ${columns} .schematic-checkout__layout {
    flex: 1;
    grid-template-columns: minmax(0, 1fr) 22rem;
    grid-template-rows: minmax(0, 1fr);
    min-height: 0;
  }

  /* A summary held for the payment step leaves its column to the steps. */
  ${columns} .schematic-checkout__layout[data-summary="payment"]:not([data-step="payment"]) {
    grid-template-columns: minmax(0, 1fr);
  }

  ${columns} .schematic-checkout__main,
  ${columns} .schematic-checkout__summary {
    overflow-y: auto;
  }

  ${columns} .schematic-checkout__summary {
    border-inline-start: 1px solid var(--schematic-card-divider);
    border-top: none;
  }
}

.schematic-checkout__main {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 1.5);
  min-width: 0;
  padding: calc(var(--schematic-space) * 1.5);
}

.schematic-checkout__stepper {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2) var(--schematic-space);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-checkout__step {
  align-items: center;
  display: inline-flex;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-checkout__step + .schematic-checkout__step::before {
  color: var(--schematic-muted);
  content: "›";
}

.schematic-checkout__step-link {
  background: none;
  border: none;
  color: var(--schematic-muted);
  cursor: pointer;
  font-family: var(--schematic-font-body);
  font-size: 0.9375rem;
  padding: 0;
}

.schematic-checkout__step-link[aria-current="step"] {
  color: var(--schematic-text);
  font-weight: 700;
}

.schematic-checkout__step-link[data-state="done"] {
  color: var(--schematic-text);
}

.schematic-checkout__step-link[data-skipped="true"] {
  font-style: italic;
}

.schematic-checkout__step-link:disabled {
  cursor: default;
}

.schematic-checkout__step-link:focus-visible {
  outline: 2px solid var(--schematic-accent);
  outline-offset: 2px;
}

.schematic-checkout__heading {
  font-family: var(--schematic-font-heading);
  font-size: 1.5rem;
  font-weight: 800;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

.schematic-checkout__controls {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--schematic-space);
}

.schematic-checkout__cards {
  display: grid;
  gap: var(--schematic-space);
  grid-template-columns: repeat(auto-fill, minmax(14rem, 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-checkout__card {
  border: 1px solid var(--schematic-border);
  border-radius: var(--schematic-radius);
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
  padding: var(--schematic-space);
}

.schematic-checkout__card[data-selected="true"] {
  outline: 2px solid var(--schematic-primary);
  outline-offset: -1px;
}

.schematic-checkout__card[data-valid="false"] {
  opacity: 0.6;
}

.schematic-checkout__card-name {
  font-family: var(--schematic-font-heading);
  font-size: 1.125rem;
  font-weight: 800;
  margin: 0;
}

.schematic-checkout__card-price {
  font-family: var(--schematic-font-heading);
  font-size: 1.5rem;
  font-variant-numeric: tabular-nums;
  font-weight: 800;
}

.schematic-checkout__card-period {
  font-family: var(--schematic-font-body);
  font-size: 0.875rem;
  font-weight: 400;
  vertical-align: baseline;
}

.schematic-checkout__card-description {
  color: var(--schematic-muted);
  font-size: 0.875rem;
  flex-grow: 1;
}

.schematic-checkout__card-badges {
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-checkout__card .schematic-cta {
  width: 100%;
}

.schematic-checkout__rows {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-checkout__row {
  align-items: center;
  border-bottom: 1px solid var(--schematic-card-divider);
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2) var(--schematic-space);
  justify-content: space-between;
  padding: calc(var(--schematic-space) * 0.75) 0;
}

.schematic-checkout__row-name {
  flex-grow: 1;
  font-weight: 600;
}

.schematic-checkout__row-detail {
  color: var(--schematic-muted);
  font-size: 0.875rem;
}

.schematic-checkout__row-amount {
  font-variant-numeric: tabular-nums;
  min-width: 5rem;
  text-align: end;
}

.schematic-checkout__input {
  background: var(--schematic-background);
  border: 1px solid var(--schematic-border);
  border-radius: 0.5rem;
  color: var(--schematic-text);
  font-family: var(--schematic-font-body);
  font-size: 1rem;
  padding: 0.5rem 0.625rem;
}

.schematic-checkout__input:focus-visible {
  outline: 2px solid var(--schematic-accent);
  outline-offset: 1px;
}

.schematic-checkout__input--quantity {
  font-variant-numeric: tabular-nums;
  width: 6rem;
}

.schematic-checkout__section {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 0.75);
}

.schematic-checkout__section-title {
  font-size: 1rem;
  font-weight: 700;
  margin: 0;
}

.schematic-checkout__field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.schematic-checkout__field-label {
  font-size: 0.875rem;
  font-weight: 600;
}

.schematic-checkout__field-helper {
  color: var(--schematic-muted);
  font-size: 0.8125rem;
}

.schematic-checkout__inline {
  align-items: flex-end;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-checkout__inline .schematic-checkout__field {
  flex-grow: 1;
}

.schematic-checkout__check {
  align-items: flex-start;
  display: flex;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-checkout__opt-in-text {
  color: var(--schematic-muted);
  font-size: 0.875rem;
  white-space: pre-wrap;
}

.schematic-checkout__problems {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-checkout__nav {
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

/* The Next action a held summary leaves here sits on the end, Back or not. */
.schematic-checkout__nav .schematic-cta {
  margin-inline-start: auto;
}

.schematic-checkout__summary {
  background: color-mix(in srgb, var(--schematic-text) 2.5%, transparent);
  border-top: 1px solid var(--schematic-card-divider);
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  padding: calc(var(--schematic-space) * 1.5);
}

.schematic-checkout__summary-title {
  font-size: 1.125rem;
  font-weight: 700;
  margin: 0;
}

.schematic-checkout__lines,
.schematic-checkout__totals {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-checkout__totals {
  border-top: 1px solid var(--schematic-card-divider);
  padding-top: var(--schematic-space);
}

.schematic-checkout__line,
.schematic-checkout__total {
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-checkout__line-amount,
.schematic-checkout__total-amount {
  font-variant-numeric: tabular-nums;
  text-align: end;
  white-space: nowrap;
}

.schematic-checkout__total--due {
  font-size: 1.125rem;
  font-weight: 700;
}

.schematic-checkout__disclaimer {
  color: var(--schematic-muted);
  font-size: 0.8125rem;
}

.schematic-checkout__summary .schematic-cta {
  width: 100%;
}
`;
