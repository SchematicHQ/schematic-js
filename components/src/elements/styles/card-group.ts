export const cardGroupCss = `
.schematic-card-group {
  background: var(--schematic-background);
  border-radius: var(--schematic-radius);
  box-shadow: var(--schematic-shadow);
  color: var(--schematic-text);
  display: flex;
  flex-direction: column;
  overflow: clip;
}

/* The group draws the one card; the clip rounds whatever meets its edge. */
.schematic-card-group .schematic-card,
.schematic-card-group .schematic-element[data-state="pending"],
.schematic-card-group .schematic-element[data-state="error"],
.schematic-card-group .schematic-plan-manager {
  background: none;
  border-radius: 0;
  box-shadow: none;
}

.schematic-card-group .schematic-metered-features__list,
.schematic-card-group .schematic-credit-usage__credits,
.schematic-card-group .schematic-plan-manager {
  gap: 0;
}

.schematic-card-group > .schematic-element + .schematic-element,
.schematic-card-group .schematic-card + .schematic-card {
  border-top: 1px solid var(--schematic-card-divider);
}

/* A header above an element's cards, rather than in one, takes the card's
   padding it would otherwise borrow from the page. */
.schematic-card-group .schematic-element:not(.schematic-card) > .schematic-header {
  margin: 0;
  padding: calc(var(--schematic-card-padding) * 0.75)
    var(--schematic-card-padding) 0;
}
`;
