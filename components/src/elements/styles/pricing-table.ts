export const pricingTableCss = `
.schematic-pricing-table {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 2);
}

.schematic-pricing-table__section {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-pricing-table__header {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-pricing-table__heading {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

.schematic-pricing-table__controls {
  align-items: center;
  display: flex;
  gap: 0.75rem;
  margin-inline-start: auto;
}

.schematic-pricing-table__plans {
  display: grid;
  gap: var(--schematic-space);
  grid-template-columns: repeat(auto-fill, minmax(min(320px, 100%), 1fr));
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-plan-card {
  display: flex;
  flex-direction: column;
  padding: var(--schematic-card-padding) 0;
  position: relative;
}

.schematic-plan-card--active {
  outline: 2px solid var(--schematic-primary);
}

.schematic-plan-card__header {
  border-bottom: 1px solid var(--schematic-card-divider);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0 var(--schematic-card-padding)
    calc(var(--schematic-card-padding) * 0.75);
}

.schematic-plan-card__name {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-weight: 800;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

.schematic-plan-card--active .schematic-plan-card__name {
  padding-inline-end: 5rem;
}

.schematic-plan-card__description {
  margin-bottom: 0.5rem;
}

.schematic-plan-card__price {
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-weight: 800;
  line-height: var(--schematic-line-height-heading);
}

.schematic-plan-card__period {
  font-family: var(--schematic-font-body);
  font-size: 0.875rem;
  font-weight: 400;
}

.schematic-plan-card__badge {
  inset-inline-end: var(--schematic-space);
  position: absolute;
  top: var(--schematic-space);
}

.schematic-plan-card__credits {
  margin-top: 0.5rem;
}

.schematic-plan-card__credits,
.schematic-plan-card__entitlements {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-plan-card__credit,
.schematic-plan-card__entitlement {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
}

.schematic-plan-card .schematic-plan-card__icon {
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

.schematic-plan-card__feature {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-plan-card__detail {
  align-items: center;
  display: flex;
  font-size: 0.875rem;
  gap: 0.25rem;
}

.schematic-plan-card__body {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: var(--schematic-card-padding);
  justify-content: end;
  padding: calc(var(--schematic-card-padding) * 0.75)
    var(--schematic-card-padding) 0;
}

.schematic-plan-card__features {
  display: flex;
  flex-direction: column;
  flex-grow: 1;
  gap: var(--schematic-space);
}

.schematic-plan-card__inclusion {
  margin-bottom: 1.5rem;
}

.schematic-plan-card__show-all {
  align-self: start;
  margin-top: var(--schematic-space);
}

.schematic-plan-card__current {
  align-items: center;
  display: flex;
  font-size: 0.9375rem;
  gap: 0.25rem;
  justify-content: center;
  line-height: 1;
  padding: 0.625rem 0;
}

.schematic-plan-card .schematic-plan-card__check {
  color: var(--schematic-primary);
  font-size: 1.25rem;
}

.schematic-plan-card__violations {
  font-size: 0.875rem;
}

.schematic-toggle__tip {
  display: inline-flex;
  position: relative;
}

.schematic-toggle__tip-content {
  font-size: 0.6875rem;
  line-height: 1;
}

.schematic-toggle__tip:hover .schematic-toggle__tip-content,
.schematic-toggle__tip:focus-within .schematic-toggle__tip-content {
  visibility: visible;
}

.schematic-plan-card__action {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-plan-card__action .schematic-cta {
  text-align: center;
  width: 100%;
}
`;
