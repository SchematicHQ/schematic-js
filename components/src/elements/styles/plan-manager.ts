export const planManagerCss = `
.schematic-plan-manager {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

/* The plan is a card under its notice; while loading or failed, the root is. */
.schematic-plan-manager[data-state="pending"],
.schematic-plan-manager[data-state="error"] {
  background: var(--schematic-background);
  border-radius: var(--schematic-radius);
  box-shadow: var(--schematic-shadow);
  padding: calc(var(--schematic-card-padding) * 0.75)
    var(--schematic-card-padding);
}

.schematic-plan-manager__notice {
  align-items: center;
  background: var(--schematic-surface);
  border-radius: var(--schematic-radius);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: calc(var(--schematic-space) * 1.5);
  text-align: center;
}

.schematic-plan-manager__notice-title {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

.schematic-plan-manager__pay-now {
  margin-top: 0.5rem;
}

.schematic-plan-manager__card {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 2);
}

.schematic-plan-manager__plan {
  align-items: center;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-plan-manager__title {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-plan-manager__name {
  font-family: var(--schematic-font-heading);
  font-size: 2.25rem;
  font-weight: 800;
  line-height: 1;
  margin: 0;
}

.schematic-plan-manager__price {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 700;
  white-space: nowrap;
}

.schematic-plan-manager__section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-plan-manager__label {
  line-height: 1;
}

.schematic-plan-manager__rows {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  list-style: none;
  margin: 0;
  padding: 0;
}

.schematic-plan-manager__row,
.schematic-plan-manager__row-main {
  align-items: baseline;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: space-between;
}

.schematic-plan-manager__row--stacked {
  align-items: stretch;
  flex-direction: column;
  gap: 0.25rem;
}

.schematic-plan-manager__item {
  font-family: var(--schematic-font-heading);
  font-size: 1.125rem;
  font-weight: 700;
}

.schematic-plan-manager__detail,
.schematic-plan-manager__used {
  align-items: center;
  display: inline-flex;
  gap: 0.25rem;
}

.schematic-plan-manager__see-all {
  align-items: center;
  align-self: flex-start;
  display: inline-flex;
  gap: 0.25rem;
  margin-top: 0.5rem;
}

.schematic-plan-manager__auto-topup {
  align-items: center;
  background: var(--schematic-surface);
  border-radius: calc(var(--schematic-radius) / 2);
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  margin-top: 0.5rem;
  padding: calc(var(--schematic-space) * 1.5);
}

.schematic-plan-manager__auto-topup-lines {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.schematic-plan-manager__change-plan {
  width: 100%;
}

.schematic-plan-manager .schematic-skeleton__cell[data-column="name"] {
  width: 10rem;
}

.schematic-plan-manager .schematic-skeleton__cell[data-column="price"] {
  width: 6rem;
}
`;
