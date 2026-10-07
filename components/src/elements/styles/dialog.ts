/**
 * The modal shell `Dialog` renders: a native `<dialog>` with a titled header,
 * a close control, and a body. Shared by every element that opens one.
 */
export const dialogCss = `
/* Up to 768px wide, with a tighter radius than a card. */
.schematic-dialog {
  background: var(--schematic-background);
  border: 0;
  border-radius: 0.5rem;
  box-shadow: var(--schematic-shadow);
  box-sizing: border-box;
  color: var(--schematic-text);
  margin: auto;
  max-height: calc(100vh - 2 * var(--schematic-space));
  max-width: none;
  /* No padding of its own: a click on the backdrop lands on the dialog
     itself, and one inside lands on the header or body. */
  padding: 0;
  /* Never wider than the screen, whatever it holds. */
  width: min(48rem, calc(100vw - 2 * var(--schematic-space)));
}

/* Centred by vw on a phone: a host page wider than the screen widens the
   layout viewport, and auto margins would centre the dialog half off the
   screen. Desktop keeps auto margins, as vw counts the scrollbar there. */
@media (max-width: 52rem) {
  .schematic-dialog {
    inset-inline: 0 auto;
    margin-inline: calc(
        (100vw - min(48rem, calc(100vw - 2 * var(--schematic-space)))) / 2
      )
      0;
  }
}

.schematic-dialog::backdrop {
  -webkit-backdrop-filter: blur(8px);
  backdrop-filter: blur(8px);
  background: var(--schematic-backdrop);
}

/* Narrow on the right, where the close control's own hit area makes up the
   rest. */
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

/* Body text at 18px, not a heading face. */
.schematic-dialog__title {
  font-family: var(--schematic-font-body);
  font-size: 1.125rem;
  font-weight: 400;
  line-height: var(--schematic-line-height);
  margin: 0;
}

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
  min-width: 0;
  overflow-wrap: anywhere;
  padding: calc(var(--schematic-space) * 1.5);
}
`;
