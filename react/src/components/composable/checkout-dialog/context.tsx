// Headless controller + context for the CheckoutDialog shell.
//
// Intentionally minimal: CheckoutDialog is a large checkout state machine
// (preview engine, Stripe confirmation, native <dialog> management) that is
// the product itself, not a display component. This seam models only the
// dialog open/close lifecycle — both derivable from `useEmbed` alone, so the
// state machine stays entirely in the styled wrapper. A consumer building a
// custom checkout shell can drive open/close from here.

import * as React from "react";

import { useEmbed } from "../../hooks";
import { createPrimitiveContext } from "../internal";

export interface CheckoutDialogContextValue {
  /** True while the checkout layout is active. */
  isOpen: boolean;
  /** Clears checkout state and returns to the portal layout. */
  close: () => void;
}

const [CheckoutDialogProvider, useCheckoutDialogContext, CheckoutDialogContext] =
  createPrimitiveContext<CheckoutDialogContextValue>("CheckoutDialog");

export { CheckoutDialogContext, CheckoutDialogProvider };

/** Consumer-facing hook. Throws outside `CheckoutDialog.Root`. */
export function useCheckoutDialog(): CheckoutDialogContextValue {
  return useCheckoutDialogContext("useCheckoutDialog");
}

export function useCheckoutDialogController(): CheckoutDialogContextValue {
  const { layout, clearCheckoutState, setLayout } = useEmbed();

  const close = React.useCallback(() => {
    clearCheckoutState();
    setLayout("portal");
  }, [clearCheckoutState, setLayout]);

  return {
    isOpen: layout === "checkout",
    close,
  };
}
