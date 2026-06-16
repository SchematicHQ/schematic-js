// Headless controller + context for the IncludedFeatures primitive.

import * as React from "react";

import { type FeatureUsageResponseData } from "../../api/checkoutexternal";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../const";
import { useEmbed } from "../../hooks";
import { createPrimitiveContext } from "../internal";

export interface IncludedFeaturesOptions {
  /** Optional ordered allow-list of feature ids to show. */
  visibleFeatures?: string[];
}

export interface IncludedFeaturesContextValue {
  /** The full (optionally ordered) feature-usage list. */
  featureUsage: FeatureUsageResponseData[];
  /** The collapsed/expanded slice of `featureUsage`. */
  displayedFeatures: FeatureUsageResponseData[];
  /** Whether the component should render at all. */
  shouldShow: boolean;
  hasMore: boolean;
  expanded: boolean;
  toggle: () => void;
}

const [
  IncludedFeaturesProvider,
  useIncludedFeaturesContext,
  IncludedFeaturesContext,
] = createPrimitiveContext<IncludedFeaturesContextValue>("IncludedFeatures");

export { IncludedFeaturesContext, IncludedFeaturesProvider };

/** Consumer-facing hook. Throws outside `IncludedFeatures.Root`. */
export function useIncludedFeatures(): IncludedFeaturesContextValue {
  return useIncludedFeaturesContext("useIncludedFeatures");
}

export function useIncludedFeaturesController(
  options: IncludedFeaturesOptions,
): IncludedFeaturesContextValue {
  const { visibleFeatures } = options;

  const { data } = useEmbed();

  const [showCount, setShowCount] = React.useState(VISIBLE_ENTITLEMENT_COUNT);

  const { plan, addOns, featureUsage } = React.useMemo(() => {
    const orderedFeatureUsage = visibleFeatures?.reduce(
      (acc: FeatureUsageResponseData[], id) => {
        const mappedFeatureUsage = data?.featureUsage?.features.find(
          (usage) => usage.feature?.id === id,
        );

        if (mappedFeatureUsage) {
          acc.push(mappedFeatureUsage);
        }

        return acc;
      },
      [],
    );

    return {
      plan: data?.company?.plan,
      addOns: data?.company?.addOns || [],
      featureUsage: orderedFeatureUsage || data?.featureUsage?.features || [],
    };
  }, [
    visibleFeatures,
    data?.company?.plan,
    data?.company?.addOns,
    data?.featureUsage?.features,
  ]);

  const featureListSize = featureUsage.length;

  const toggle = () => {
    setShowCount((prev) =>
      prev > VISIBLE_ENTITLEMENT_COUNT
        ? VISIBLE_ENTITLEMENT_COUNT
        : featureListSize,
    );
  };

  // Render when there is any plan, add-on, or feature (features may exist via
  // company overrides even without a plan/add-on).
  const shouldShow = !!(featureUsage.length > 0 || plan || addOns.length > 0);

  return {
    featureUsage,
    displayedFeatures: featureUsage.slice(0, showCount),
    shouldShow,
    hasMore: featureListSize > VISIBLE_ENTITLEMENT_COUNT,
    expanded: showCount > VISIBLE_ENTITLEMENT_COUNT,
    toggle,
  };
}
