/**
 * The modal shell `Dialog` renders: a native `<dialog>` with a titled header,
 * a close control, and a body. Shared by every element that opens one.
 */
export const dialogCss = `
/* The embed's dialog: up to 768px wide, with a tighter radius than a card. */
.schematic-dialog {
  background: var(--schematic-background);
  border: 0;
  border-radius: 0.5rem;
  box-shadow: var(--schematic-shadow);
  color: var(--schematic-text);
  line-height: 1.375;
  margin: auto;
  max-height: calc(100vh - 2 * var(--schematic-space));
  max-width: 48rem;
  /* No padding of its own: a click on the backdrop lands on the dialog
     itself, and one inside lands on the header or body. */
  padding: 0;
  width: calc(100% - 2 * var(--schematic-space));
}

.schematic-dialog::backdrop {
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  background: var(--schematic-backdrop);
}

/* The embed's padding: narrow on the right, where the close control's own
   hit area makes up the rest. */
.schematic-dialog__header {
  align-items: center;
  border-bottom: 1px solid
    color-mix(in srgb, var(--schematic-text) 15%, transparent);
  display: flex;
  gap: var(--schematic-space);
  justify-content: space-between;
  padding: 0.5rem 0.5rem 0.5rem 1.5rem;
}

@media (min-width: 768px) {
  .schematic-dialog__header {
    padding: 1rem 0.75rem 1rem 3rem;
  }
}

/* The embed's dialog title: body text at 18px, not a heading face. */
.schematic-dialog__title {
  font-family: var(--schematic-font-body);
  font-size: 1.125rem;
  font-weight: 400;
  line-height: var(--schematic-line-height-heading);
  margin: 0;
}

/* The embed's close control: a 2.5rem glyph in the text colour at 27.5%,
   centred in a 2.75rem target. */
.schematic-dialog__close {
  align-items: center;
  background: none;
  border: none;
  color: color-mix(in srgb, var(--schematic-text) 27.5%, transparent);
  cursor: pointer;
  display: inline-flex;
  flex-shrink: 0;
  font-size: 2.5rem;
  height: 2.75rem;
  justify-content: center;
  line-height: 1;
  padding: 0;
  width: 2.75rem;
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
