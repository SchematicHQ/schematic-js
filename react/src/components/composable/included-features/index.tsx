// IncludedFeatures composable namespace.
//
//   <IncludedFeatures.Root visibleFeatures={[…]}>
//     <IncludedFeatures.Content>
//       {({ displayedFeatures }) => …}
//     </IncludedFeatures.Content>
//     <IncludedFeatures.ToggleMore>
//       {({ expanded, toggle }) => …}
//     </IncludedFeatures.ToggleMore>
//   </IncludedFeatures.Root>

import * as React from "react";

import { type FeatureUsageResponseData } from "../../api/checkoutexternal";
import { type RenderProp } from "../internal";

import {
  IncludedFeaturesProvider,
  useIncludedFeatures,
  useIncludedFeaturesController,
  type IncludedFeaturesOptions,
} from "./context";

export interface IncludedFeaturesRootProps extends IncludedFeaturesOptions {
  children?: React.ReactNode;
}

/** Pure provider — runs the controller and publishes context. */
function Root({ children, ...options }: IncludedFeaturesRootProps) {
  const value = useIncludedFeaturesController(options);
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.featureUsage,
      value.displayedFeatures,
      value.shouldShow,
      value.hasMore,
      value.expanded,
    ],
  );
  return (
    <IncludedFeaturesProvider value={memoized}>
      {children}
    </IncludedFeaturesProvider>
  );
}
Root.displayName = "IncludedFeatures.Root";

/** Renders children only when the component should be shown. */
function Content({
  children,
}: {
  children: RenderProp<{
    featureUsage: FeatureUsageResponseData[];
    displayedFeatures: FeatureUsageResponseData[];
  }>;
}) {
  const { shouldShow, featureUsage, displayedFeatures } = useIncludedFeatures();
  if (!shouldShow) {
    return null;
  }
  return <>{children({ featureUsage, displayedFeatures })}</>;
}
Content.displayName = "IncludedFeatures.Content";

/** Exposes the expand/collapse toggle; renders only when there's more to show. */
function ToggleMore({
  children,
}: {
  children: RenderProp<{ expanded: boolean; toggle: () => void }>;
}) {
  const { hasMore, expanded, toggle } = useIncludedFeatures();
  return hasMore ? <>{children({ expanded, toggle })}</> : null;
}
ToggleMore.displayName = "IncludedFeatures.ToggleMore";

export const IncludedFeatures = Object.assign(Root, {
  Root,
  Content,
  ToggleMore,
});

export {
  IncludedFeaturesContext,
  useIncludedFeatures,
  type IncludedFeaturesContextValue,
  type IncludedFeaturesOptions,
} from "./context";
