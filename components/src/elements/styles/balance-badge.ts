export const balanceBadgeCss = `
.schematic-balance-badge__pill {
  gap: 0.5rem;
}

.schematic-balance-badge__amount,
.schematic-balance-badge__reset {
  white-space: nowrap;
}

.schematic-balance-badge__meter {
  background: color-mix(in srgb, var(--schematic-text) 12%, transparent);
  flex: none;
  width: 3rem;
}

.schematic-balance-badge__meter .schematic-meter__fill {
  display: block;
}

.schematic-balance-badge .schematic-skeleton__cell[data-column="badge"] {
  background: color-mix(in srgb, var(--schematic-muted) 25%, transparent);
  border-radius: 999px;
  height: 0.5rem;
  width: 8rem;
}
`;
