// MeteredFeatures composable namespace.
//
//   <MeteredFeatures.Root visibleFeatures={[…]}>
//     <MeteredFeatures.Features>
//       {(entitlement) => …}
//     </MeteredFeatures.Features>
//     <MeteredFeatures.Credits>
//       {(credit, { expanded, toggle }) => …}
//     </MeteredFeatures.Credits>
//   </MeteredFeatures.Root>

import * as React from "react";

import { type FeatureUsageResponseData } from "../../api/checkoutexternal";

import {
  MeteredFeaturesProvider,
  useMeteredFeatures,
  useMeteredFeaturesController,
  type MeteredCreditGroup,
  type MeteredFeaturesOptions,
} from "./context";

export interface MeteredFeaturesRootProps extends MeteredFeaturesOptions {
  children?: React.ReactNode;
}

/** Pure provider — runs the controller and publishes context. */
function Root({ children, ...options }: MeteredFeaturesRootProps) {
  const value = useMeteredFeaturesController(options);
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.meteredFeatures,
      value.creditGroups,
      value.shouldShow,
      value.period,
      value.canCheckout,
      value.showCredits,
      value.isCreditExpanded,
    ],
  );
  return (
    <MeteredFeaturesProvider value={memoized}>
      {children}
    </MeteredFeaturesProvider>
  );
}
Root.displayName = "MeteredFeatures.Root";

/** Renders children only when there are metered features or credits to show. */
function Empty({ children }: { children?: React.ReactNode }) {
  const { shouldShow } = useMeteredFeatures();
  return shouldShow ? null : <>{children}</>;
}
Empty.displayName = "MeteredFeatures.Empty";

/** Maps over the metered features, calling the render-prop for each. */
function Features({
  children,
}: {
  children: (
    entitlement: FeatureUsageResponseData,
    index: number,
  ) => React.ReactNode;
}) {
  const { meteredFeatures } = useMeteredFeatures();
  return <>{meteredFeatures.map((feature, index) => children(feature, index))}</>;
}
Features.displayName = "MeteredFeatures.Features";

/**
 * Maps over the credit groups (only when `showCredits` is enabled), exposing
 * each group's expand/collapse state.
 */
function Credits({
  children,
}: {
  children: (
    credit: MeteredCreditGroup,
    state: { expanded: boolean; toggle: () => void },
    index: number,
  ) => React.ReactNode;
}) {
  const { creditGroups, showCredits, isCreditExpanded, toggleBalanceDetails } =
    useMeteredFeatures();
  if (!showCredits) {
    return null;
  }
  return (
    <>
      {creditGroups.map((credit, index) =>
        children(
          credit,
          {
            expanded: isCreditExpanded(credit.id),
            toggle: () => toggleBalanceDetails(credit.id),
          },
          index,
        ),
      )}
    </>
  );
}
Credits.displayName = "MeteredFeatures.Credits";

export const MeteredFeatures = Object.assign(Root, {
  Root,
  Empty,
  Features,
  Credits,
});

export {
  MeteredFeaturesContext,
  useMeteredFeatures,
  type MeteredCreditGroup,
  type MeteredFeaturesContextValue,
  type MeteredFeaturesOptions,
} from "./context";
