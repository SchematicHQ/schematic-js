// Headless controller + context for the MeteredFeatures primitive.
//
// Lifts the metered-feature filtering/ordering, credit-grant grouping, the
// per-credit expand/collapse state, visibility gating, and the checkout
// actions (add usage / buy credits).

import * as React from "react";

import {
  FeatureType,
  type FeatureUsageResponseData,
} from "../../api/checkoutexternal";
import { useEmbed } from "../../hooks";
import { getSubscriptionPeriod, groupCreditGrants } from "../../utils";
import { createPrimitiveContext } from "../internal";

export type MeteredCreditGroup = ReturnType<typeof groupCreditGrants>[number];

export interface MeteredFeaturesOptions {
  /** Optional ordered allow-list of feature ids to show. */
  visibleFeatures?: string[];
}

export interface MeteredFeaturesContextValue {
  meteredFeatures: FeatureUsageResponseData[];
  creditGroups: MeteredCreditGroup[];
  /** Whether the component should render at all. */
  shouldShow: boolean;
  period?: string;
  canCheckout: boolean;
  showCredits: boolean;
  isCreditExpanded: (id: string) => boolean;
  toggleBalanceDetails: (id: string) => void;
  /** Opens checkout for purchasing additional usage. */
  addUsage: () => void;
  /** Opens checkout for purchasing additional credits. */
  buyCredits: () => void;
}

const [
  MeteredFeaturesProvider,
  useMeteredFeaturesContext,
  MeteredFeaturesContext,
] = createPrimitiveContext<MeteredFeaturesContextValue>("MeteredFeatures");

export { MeteredFeaturesContext, MeteredFeaturesProvider };

/** Consumer-facing hook. Throws outside `MeteredFeatures.Root`. */
export function useMeteredFeatures(): MeteredFeaturesContextValue {
  return useMeteredFeaturesContext("useMeteredFeatures");
}

export function useMeteredFeaturesController(
  options: MeteredFeaturesOptions,
): MeteredFeaturesContextValue {
  const { visibleFeatures } = options;

  const { data, setCheckoutState } = useEmbed();

  const meteredFeatures = React.useMemo(() => {
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

    return (orderedFeatureUsage || data?.featureUsage?.features || []).filter(
      ({ feature }) =>
        feature?.featureType === FeatureType.Event ||
        feature?.featureType === FeatureType.Trait,
    );
  }, [visibleFeatures, data?.featureUsage?.features]);

  const creditGroups = React.useMemo(
    () => groupCreditGrants(data?.creditGrants || [], { groupBy: "credit" }),
    [data?.creditGrants],
  );

  const [creditVisibility, setCreditVisibility] = React.useState(
    creditGroups.map(({ id }) => ({ id, isExpanded: false })),
  );

  const toggleBalanceDetails = React.useCallback((id: string) => {
    setCreditVisibility((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, isExpanded: !item.isExpanded } : item,
      ),
    );
  }, []);

  const isCreditExpanded = React.useCallback(
    (id: string) =>
      creditVisibility.find((item) => item.id === id)?.isExpanded ?? false,
    [creditVisibility],
  );

  const period =
    getSubscriptionPeriod(data?.company?.billingSubscription) ??
    (typeof data?.company?.plan?.planPeriod === "string"
      ? data.company?.plan?.planPeriod
      : undefined);

  return {
    meteredFeatures,
    creditGroups,
    shouldShow: meteredFeatures.length > 0 || creditGroups.length > 0,
    period,
    canCheckout: data?.capabilities?.checkout ?? false,
    showCredits: data?.displaySettings?.showCredits ?? true,
    isCreditExpanded,
    toggleBalanceDetails,
    addUsage: () => setCheckoutState({ usage: true }),
    buyCredits: () => setCheckoutState({ credits: true }),
  };
}
