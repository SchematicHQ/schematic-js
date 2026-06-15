// Headless PaymentMethod parts — no styled-components, no Stripe. They expose
// the resolved payment-method data + edit action through render props and
// `asChild`-friendly elements.

import * as React from "react";

import { Slot, partAttrs, type AsChildProps, type RenderProp } from "../internal";

import { usePaymentMethod } from "./context";
import {
  getPaymentMethodData,
  type PaymentMethodDisplayData,
} from "./getPaymentMethodData";

/**
 * Exposes the resolved payment method's display fields via render prop. When
 * there is no payment method, `data` is undefined and `hasPaymentMethod` is
 * false so consumers can render an empty state inline.
 */
export function Label({
  children,
}: {
  children: RenderProp<{
    data?: PaymentMethodDisplayData;
    hasPaymentMethod: boolean;
  }>;
}) {
  const { paymentMethod, hasPaymentMethod } = usePaymentMethod();
  return (
    <>
      {children({
        data: paymentMethod ? getPaymentMethodData(paymentMethod) : undefined,
        hasPaymentMethod,
      })}
    </>
  );
}
Label.displayName = "PaymentMethod.Label";

/**
 * Renders children only when the card is expiring soon (< 4 months). Exposes
 * `monthsToExpiration` via render prop.
 */
export function Expiration({
  children,
}: {
  children: React.ReactNode | RenderProp<{ monthsToExpiration?: number }>;
}) {
  const { isExpiringSoon, monthsToExpiration } = usePaymentMethod();
  if (!isExpiringSoon) {
    return null;
  }
  return (
    <>
      {typeof children === "function"
        ? children({ monthsToExpiration })
        : children}
    </>
  );
}
Expiration.displayName = "PaymentMethod.Expiration";

/** Renders children only when there is no payment method on file. */
export function Empty({ children }: { children?: React.ReactNode }) {
  const { hasPaymentMethod } = usePaymentMethod();
  return hasPaymentMethod ? null : <>{children}</>;
}
Empty.displayName = "PaymentMethod.Empty";

export type EditTriggerProps = AsChildProps<"button">;

/**
 * A button (or `asChild` element) that invokes the edit action. Renders
 * nothing when editing is disabled (no `onEdit` from the controller).
 */
export const EditTrigger = React.forwardRef<
  HTMLButtonElement,
  EditTriggerProps
>(({ asChild, onClick, children, ...rest }, ref) => {
  const { onEdit } = usePaymentMethod();
  if (!onEdit) {
    return null;
  }

  const Comp = asChild ? Slot : "button";

  return (
    <Comp
      ref={ref as React.Ref<never>}
      type={asChild ? undefined : "button"}
      {...partAttrs("payment-method-edit")}
      onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
        (onClick as React.MouseEventHandler<HTMLButtonElement>)?.(event);
        onEdit();
      }}
      {...rest}
    >
      {children}
    </Comp>
  );
});
EditTrigger.displayName = "PaymentMethod.EditTrigger";
