/**
 * The modal shell `Dialog` renders: a native `<dialog>` with a titled header,
 * a close control, and a body. Shared by every element that opens one.
 */
export const dialogCss = `
.schematic-dialog {
  background: var(--schematic-background);
  border: 0;
  border-radius: var(--schematic-radius);
  box-shadow: var(--schematic-shadow);
  color: var(--schematic-text);
  margin: auto;
  max-height: calc(100vh - 2 * var(--schematic-space));
  max-width: 34rem;
  /* No padding of its own: a click on the backdrop lands on the dialog
     itself, and one inside lands on the header or body. */
  padding: 0;
  width: calc(100% - 2 * var(--schematic-space));
}

.schematic-dialog::backdrop {
  background: var(--schematic-backdrop);
}

.schematic-dialog__header {
  align-items: center;
  border-bottom: 1px solid var(--schematic-card-divider);
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  padding: var(--schematic-space) calc(var(--schematic-space) * 1.5);
}

.schematic-dialog__title {
  font-family: var(--schematic-font-heading);
  font-size: 1.125rem;
  font-weight: 600;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

/* Holds the close glyph; its font-size is the glyph's. */
.schematic-dialog__close {
  align-items: center;
  background: none;
  border: none;
  border-radius: 9999px;
  color: var(--schematic-muted);
  cursor: pointer;
  display: inline-flex;
  font-size: 1.25rem;
  justify-content: center;
  line-height: 1;
  padding: calc(var(--schematic-space) / 4);
}

.schematic-dialog__close:hover {
  color: var(--schematic-text);
}

.schematic-dialog__close:focus-visible {
  outline: 2px solid var(--schematic-accent);
  outline-offset: 2px;
}

.schematic-dialog__body {
  display: flex;
  flex-direction: column;
  gap: var(--schematic-space);
  padding: calc(var(--schematic-space) * 1.5);
}
`;
