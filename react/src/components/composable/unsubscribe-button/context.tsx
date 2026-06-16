// Headless controller + context for the UnsubscribeButton primitive.

import * as React from "react";

import { useEmbed } from "../../hooks";
import { createPrimitiveContext } from "../internal";

export interface UnsubscribeButtonContextValue {
  /** True when there is an active, non-cancelling subscription. */
  hasActiveSubscription: boolean;
  /** Opens the unsubscribe layout. */
  unsubscribe: () => void;
}

const [
  UnsubscribeButtonProvider,
  useUnsubscribeButtonContext,
  UnsubscribeButtonContext,
] = createPrimitiveContext<UnsubscribeButtonContextValue>("UnsubscribeButton");

export { UnsubscribeButtonContext, UnsubscribeButtonProvider };

/** Consumer-facing hook. Throws outside `UnsubscribeButton.Root`. */
export function useUnsubscribeButton(): UnsubscribeButtonContextValue {
  return useUnsubscribeButtonContext("useUnsubscribeButton");
}

export function useUnsubscribeButtonController(): UnsubscribeButtonContextValue {
  const { data, setLayout } = useEmbed();

  const hasActiveSubscription = React.useMemo(
    () =>
      !!data?.subscription &&
      data.subscription.status !== "cancelled" &&
      !data.subscription.cancelAt,
    [data?.subscription],
  );

  return {
    hasActiveSubscription,
    unsubscribe: () => setLayout("unsubscribe"),
  };
}
