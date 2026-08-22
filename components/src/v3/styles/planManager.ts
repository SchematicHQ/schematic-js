/**
 * PlanManager rules. Builds on the base tokens and shared classes in
 * ./index.tsx (`.schematic-card`, `.schematic-row`, `.schematic-notice`,
 * `.schematic-cta`, `.schematic-link-button`).
 */
export const planManagerCss = `
/* ---------- PlanManager ---------- */
.schematic-plan-manager {
  display: flex;
  flex-direction: column;
  gap: calc(var(--schematic-space) * 1.5);
}

.schematic-plan-manager__header {
  align-items: flex-start;
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
}

.schematic-plan-manager__header h2 {
  font-size: 1.8125rem;
  font-weight: 800;
  margin: 0 0 calc(var(--schematic-space) / 4);
}

.schematic-plan-manager__price {
  flex-shrink: 0;
  font-family: var(--schematic-font-heading);
  font-size: 1.8125rem;
  font-weight: 800;
  text-align: right;
  white-space: nowrap;
}

.schematic-plan-manager__price sub {
  font-family: var(--schematic-font-body);
  font-size: 0.875rem;
  font-weight: 400;
  vertical-align: baseline;
}

.schematic-plan-manager__notice h3 {
  font-size: 1rem;
  margin-bottom: calc(var(--schematic-space) / 4);
}

.schematic-plan-manager__notice .schematic-cta {
  margin-top: calc(var(--schematic-space) / 2);
}

.schematic-plan-manager__section {
  border-top: 1px solid var(--schematic-card-divider);
  padding-top: var(--schematic-space);
}

.schematic-plan-manager__section h3 {
  font-size: 1rem;
  font-weight: 600;
}

.schematic-plan-manager__section .schematic-row sub {
  color: var(--schematic-muted);
  font-size: 0.875rem;
  vertical-align: baseline;
}

.schematic-plan-manager__detail {
  display: block;
  font-size: 0.875rem;
}

.schematic-plan-manager__auto-topup {
  background: color-mix(
    in oklch,
    var(--schematic-background) 96%,
    var(--schematic-text)
  );
  border-radius: 0.5rem;
  margin-top: var(--schematic-space);
  padding: var(--schematic-space);
}

.schematic-plan-manager__label {
  font-weight: 500;
  margin-bottom: calc(var(--schematic-space) / 2);
}

.schematic-plan-manager__action .schematic-cta {
  width: 100%;
}
`;
