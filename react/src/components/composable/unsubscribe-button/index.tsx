// UnsubscribeButton composable namespace.
//
//   <UnsubscribeButton.Root>
//     <UnsubscribeButton.Trigger>Unsubscribe</UnsubscribeButton.Trigger>
//   </UnsubscribeButton.Root>

import * as React from "react";

import { Slot, partAttrs, type AsChildProps } from "../internal";

import {
  UnsubscribeButtonProvider,
  useUnsubscribeButton,
  useUnsubscribeButtonController,
} from "./context";

export interface UnsubscribeButtonRootProps {
  children?: React.ReactNode;
}

/** Pure provider — runs the controller and publishes context. */
function Root({ children }: UnsubscribeButtonRootProps) {
  const value = useUnsubscribeButtonController();
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.hasActiveSubscription],
  );
  return (
    <UnsubscribeButtonProvider value={memoized}>
      {children}
    </UnsubscribeButtonProvider>
  );
}
Root.displayName = "UnsubscribeButton.Root";

export type TriggerProps = AsChildProps<"button">;

/** A button (or `asChild` element) that opens the unsubscribe flow. */
const Trigger = React.forwardRef<HTMLButtonElement, TriggerProps>(
  ({ asChild, onClick, children, ...rest }, ref) => {
    const { unsubscribe } = useUnsubscribeButton();
    const Comp = asChild ? Slot : "button";
    return (
      <Comp
        ref={ref as React.Ref<never>}
        type={asChild ? undefined : "button"}
        {...partAttrs("unsubscribe-trigger")}
        onClick={(event: React.MouseEvent<HTMLButtonElement>) => {
          (onClick as React.MouseEventHandler<HTMLButtonElement>)?.(event);
          unsubscribe();
        }}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
Trigger.displayName = "UnsubscribeButton.Trigger";

export const UnsubscribeButton = Object.assign(Root, { Root, Trigger });

export {
  UnsubscribeButtonContext,
  useUnsubscribeButton,
  type UnsubscribeButtonContextValue,
} from "./context";
