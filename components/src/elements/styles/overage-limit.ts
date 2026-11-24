export const overageLimitCss = `
.schematic-overage-limit {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-overage-limit .schematic-header {
  margin-bottom: 0;
}

.schematic-overage-limit__limit {
  font-family: var(--schematic-font-heading);
  font-size: 1.75rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: var(--schematic-line-height-heading);
}

.schematic-overage-limit__usage {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-overage-limit__left {
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.schematic-overage-limit__warning {
  color: var(--schematic-warning);
}

.schematic-overage-limit__actions {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-overage-limit__buttons {
  display: flex;
  gap: calc(var(--schematic-space) / 2);
}

.schematic-overage-limit__form {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
}

.schematic-overage-limit__label {
  font-weight: 500;
}

.schematic-overage-limit__input {
  position: relative;
}

.schematic-overage-limit__input .schematic-input {
  font-variant-numeric: tabular-nums;
  padding-inline-end: 7rem;
}

.schematic-overage-limit__unit {
  inset-inline-end: 0.75rem;
  pointer-events: none;
  position: absolute;
  top: 50%;
  transform: translateY(-50%);
}

.schematic-overage-limit .schematic-skeleton__cell[data-column="credit"] {
  width: 6rem;
}

.schematic-overage-limit .schematic-skeleton__cell[data-column="rate"] {
  width: 9rem;
}

.schematic-overage-limit .schematic-skeleton__cell[data-column="limit"] {
  height: 2rem;
  width: 10rem;
}

.schematic-overage-limit .schematic-skeleton__cell[data-column="action"] {
  height: 2.5rem;
  width: 7rem;
}
`;
