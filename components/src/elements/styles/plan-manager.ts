export const planManagerCss = `
.schematic-plan-manager {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

/* While loading or failed there is no plan card, so the root draws one. */
.schematic-plan-manager[data-state="pending"],
.schematic-plan-manager[data-state="error"] {
  background: var(--schematic-background);
  border-radius: var(--schematic-radius);
  box-shadow: var(--schematic-shadow);
  padding: calc(var(--schematic-card-padding) * 0.75)
    var(--schematic-card-padding);
}

/* As in the embed, a notice is a band across the top of the card: the
   root draws the card and the plan's own card goes flat. */
.schematic-plan-manager:has(.schematic-plan-manager__notice) {
  background: var(--schematic-background);
  border-radius: var(--schematic-radius);
  box-shadow: var(--schematic-shadow);
  gap: 0;
  overflow: hidden;
}

.schematic-plan-manager:has(.schematic-plan-manager__notice)
  .schematic-plan-manager__card {
  border-radius: 0;
  box-shadow: none;
}

.schematic-plan-manager__notice {
  align-items: center;
  background: var(--schematic-inset);
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  padding: calc(var(--schematic-space) * 1.5);
  text-align: center;
}

.schematic-plan-manager__notice-title {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

.schematic-plan-manager__notice-body {
  font-size: 0.8125rem;
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
  font-size: 2.3125rem;
  font-weight: 800;
  line-height: 1;
  margin: 0;
}

.schematic-plan-manager__price {
  font-family: var(--schematic-font-heading);
  font-size: 1.25rem;
  font-weight: 600;
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

/* Centred as in the embed; a plan credit's name and figure share a
   baseline above the line that explains them. */
.schematic-plan-manager__row,
.schematic-plan-manager__row-main {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-plan-manager__row-main {
  align-items: baseline;
  gap: 0.5rem;
}

.schematic-plan-manager__row--stacked {
  align-items: stretch;
  flex-direction: column;
  gap: 0.25rem;
}

.schematic-plan-manager__item {
  font-family: var(--schematic-font-heading);
  font-size: 1.125rem;
  font-weight: 800;
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

.schematic-plan-manager__see-all .schematic-chevron {
  margin-inline-start: -0.333rem;
}

.schematic-plan-manager__auto-topup {
  align-items: center;
  background: var(--schematic-inset);
  border-radius: calc(var(--schematic-radius) * 0.8);
  display: flex;
  gap: 0.5rem;
  justify-content: space-between;
  padding: calc(var(--schematic-space) * 1.5);
}

.schematic-plan-manager__auto-topup-lines {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  line-height: 1.25;
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
