// Headless controller + context for the PaymentMethod primitive.
//
// Lifts the derivation the legacy `PaymentMethod` container owned: resolving
// the active payment method, computing months-to-expiration, and wiring the
// edit action to `setLayout("payment")`. It models the *display + edit* of an
// already-loaded method only — entering/confirming a card (Stripe) stays in
// the styled `/components` layer.

import * as React from "react";

import {
  type CheckoutFieldWithValue,
  type PaymentMethodResponseData,
} from "../../api/checkoutexternal";
import { useEmbed } from "../../hooks";
import { createPrimitiveContext } from "../internal";

export interface PaymentMethodOptions {
  /** Whether the edit action is exposed (wires `onEdit`). Defaults to true. */
  allowEdit?: boolean;
}

export interface PaymentMethodContextValue {
  paymentMethod?: PaymentMethodResponseData;
  monthsToExpiration?: number;
  customCheckoutFields?: CheckoutFieldWithValue[];
  isExpiringSoon: boolean;
  hasPaymentMethod: boolean;
  onEdit?: () => void;
}

const [PaymentMethodProvider, usePaymentMethodContext, PaymentMethodContext] =
  createPrimitiveContext<PaymentMethodContextValue>("PaymentMethod");

export { PaymentMethodContext, PaymentMethodProvider };

/** Consumer-facing hook. Throws when used outside `PaymentMethod.Root`. */
export function usePaymentMethod(): PaymentMethodContextValue {
  return usePaymentMethodContext("usePaymentMethod");
}

export function usePaymentMethodController(
  options: PaymentMethodOptions,
): PaymentMethodContextValue {
  const { allowEdit = true } = options;

  const { data, setLayout } = useEmbed();

  const { paymentMethod, monthsToExpiration } = React.useMemo(() => {
    const paymentMethod =
      data?.subscription?.paymentMethod || data?.company?.defaultPaymentMethod;

    let monthsToExpiration: number | undefined;
    if (
      typeof paymentMethod?.cardExpYear === "number" &&
      typeof paymentMethod?.cardExpMonth === "number"
    ) {
      const now = new Date();
      const currentYear = now.getFullYear();
      const currentMonth = now.getMonth();
      const timeToExpiration = Math.round(
        +new Date(paymentMethod.cardExpYear, paymentMethod.cardExpMonth - 1) -
          +new Date(currentYear, currentMonth),
      );
      monthsToExpiration = Math.round(
        timeToExpiration / (1000 * 60 * 60 * 24 * 30),
      );
    }

    return { paymentMethod, monthsToExpiration };
  }, [data?.company?.defaultPaymentMethod, data?.subscription?.paymentMethod]);

  return {
    paymentMethod,
    monthsToExpiration,
    customCheckoutFields: data?.customCheckoutFields,
    isExpiringSoon:
      typeof monthsToExpiration === "number" && monthsToExpiration < 4,
    hasPaymentMethod: !!paymentMethod,
    onEdit: allowEdit ? () => setLayout("payment") : undefined,
  };
}
