// CheckoutDialog composable namespace (minimal open/close seam).
//
//   <CheckoutDialog.Root>
//     <CheckoutDialog.Close>Close</CheckoutDialog.Close>
//     // useCheckoutDialog() -> { isOpen, close }
//   </CheckoutDialog.Root>

import * as React from "react";

import { Slot, partAttrs, type AsChildProps } from "../internal";

import {
  CheckoutDialogProvider,
  useCheckoutDialog,
  useCheckoutDialogController,
} from "./context";

export interface CheckoutDialogRootProps {
  children?: React.ReactNode;
}

/** Pure provider — runs the controller and publishes context. */
function Root({ children }: CheckoutDialogRootProps) {
  const value = useCheckoutDialogController();
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.isOpen, value.close],
  );
  return (
    <CheckoutDialogProvider value={memoized}>{children}</CheckoutDialogProvider>
  );
}
Root.displayName = "CheckoutDialog.Root";

export type CloseProps = AsChildProps<"button">;

/** A button (or `asChild` element) that closes the checkout dialog. */
const Close = React.forwardRef<HTMLButtonElement, CloseProps>(
  ({ asChild, onClick, children, ...rest }, ref) => {
    const { close } = useCheckoutDialog();
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref as React.Ref<never>}
        type={asChild ? undefined : "button"}
        {...partAttrs("checkout-dialog-close")}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          (onClick as React.MouseEventHandler<HTMLButtonElement>)?.(event);
          close();
        }}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
Close.displayName = "CheckoutDialog.Close";

export const CheckoutDialog = Object.assign(Root, { Root, Close });

export {
  CheckoutDialogContext,
  useCheckoutDialog,
  type CheckoutDialogContextValue,
} from "./context";
