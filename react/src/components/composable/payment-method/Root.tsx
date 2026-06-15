// PaymentMethod.Root — runs the controller and publishes context. Pure
// provider (no DOM) so the styled wrapper reproduces today's markup exactly.

import * as React from "react";

import {
  PaymentMethodProvider,
  usePaymentMethodController,
  type PaymentMethodOptions,
} from "./context";

export interface PaymentMethodRootProps extends PaymentMethodOptions {
  children?: React.ReactNode;
}

export function Root({ children, ...options }: PaymentMethodRootProps) {
  const value = usePaymentMethodController(options);

  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.paymentMethod,
      value.monthsToExpiration,
      value.customCheckoutFields,
      value.isExpiringSoon,
      value.hasPaymentMethod,
      value.onEdit,
    ],
  );

  return (
    <PaymentMethodProvider value={memoized}>{children}</PaymentMethodProvider>
  );
}

Root.displayName = "PaymentMethod.Root";
