// Headless controller + context for the PricingTable primitive.
//
// `usePricingTableController` lifts every piece of state and derivation that
// the legacy `PricingTable` container owned (period/currency selection,
// snap-to-valid currency, `hydratePublic`, currency filtering, per-plan period
// derivation, CTA resolution, the `setCheckoutState` action). `Root` runs it
// once and publishes the result through `PricingTableContext`; the styled
// wrapper and any consumer parts read it via `usePricingTable()`.

import * as React from "react";

import {
  BillingProductPriceInterval,
  type CompanyPlanDetailResponseData,
} from "../../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../../api/componentspublic";
import { DEFAULT_CURRENCY } from "../../const";
import {
  useAvailableCurrenciesWithInvalid,
  useAvailablePlans,
  useEmbed,
} from "../../hooks";
import type { SelectedPlan } from "../../types";
import { getSubscriptionPeriod, planSupportsCurrency } from "../../utils";
import { createPrimitiveContext } from "../internal";

export interface PricingTableOptions {
  callToActionUrl?: string;
  callToActionTarget?: React.HTMLAttributeAnchorTarget;
  onCallToAction?: (
    plan: PlanViewPublicResponseData | CompanyPlanDetailResponseData,
  ) => unknown;
  /**
   * Override for the period toggle visibility. Affects which plans are
   * returned (`useSelectedPeriod`) and per-plan period derivation, so it lives
   * in the controller rather than the styled layer. Falls back to
   * `data.displaySettings.showPeriodToggle`, then `true`.
   */
  showPeriodToggle?: boolean;
}

export interface PricingTableContextValue {
  // raw data
  plans: SelectedPlan[];
  addOns: SelectedPlan[];
  periods: string[];
  currencies: string[];
  invalidFilterEntries: string[];
  currentPlan?: SelectedPlan;
  // selection
  selectedPeriod: string;
  setSelectedPeriod: (period: string) => void;
  selectedCurrency: string;
  setSelectedCurrency: (currency: string) => void;
  // flags
  isPending: boolean;
  hasNoUsableCurrency: boolean;
  showPeriodToggle: boolean;
  showCurrencySelector: boolean;
  hasCurrency: boolean;
  isStandalone: boolean;
  canCheckout: boolean;
  showCallToAction: boolean;
  callToActionUrl?: string;
  callToActionTarget?: React.HTMLAttributeAnchorTarget;
  onCallToAction?: PricingTableOptions["onCallToAction"];
  // derivations
  getPlanPeriod: (plan: SelectedPlan) => string;
  isPlanActive: (plan: SelectedPlan, period: string) => boolean;
  isAddOnActive: (addOn: SelectedPlan, period: string) => boolean;
  // actions
  selectPlan: (plan: SelectedPlan) => void;
  selectAddOn: (addOn: SelectedPlan) => void;
}

const [PricingTableProvider, usePricingTableContext, PricingTableContext] =
  createPrimitiveContext<PricingTableContextValue>("PricingTable");

export { PricingTableContext, PricingTableProvider };

/** Consumer-facing hook. Throws when used outside `PricingTable.Root`. */
export function usePricingTable(): PricingTableContextValue {
  return usePricingTableContext("usePricingTable");
}

function resolveCallToActionTarget(
  url?: string,
  target?: React.HTMLAttributeAnchorTarget,
): React.HTMLAttributeAnchorTarget {
  if (target) {
    return target;
  }

  if (url) {
    try {
      const ctaUrlOrigin = new URL(url).origin;
      if (ctaUrlOrigin === window.location.hostname) {
        return "_self";
      }
    } catch {
      // fall back to the default when the provided value is not a full URL
    }
  }

  return "_blank";
}

/**
 * The PricingTable controller. Returns the full context value; `Root` memoizes
 * and publishes it.
 */
export function usePricingTableController(
  options: PricingTableOptions,
): PricingTableContextValue {
  const { callToActionUrl, callToActionTarget, onCallToAction } = options;

  const { data, isPending, hydratePublic, currencyFilter, setCheckoutState } =
    useEmbed();

  const [selectedPeriod, setSelectedPeriod] = React.useState(
    () =>
      getSubscriptionPeriod(data?.company?.billingSubscription) ||
      data?.company?.plan?.planPeriod ||
      "month",
  );

  const { currencies, invalidFilterEntries } =
    useAvailableCurrenciesWithInvalid();
  const [selectedCurrency, setSelectedCurrency] = React.useState(
    () => currencies[0] ?? DEFAULT_CURRENCY,
  );

  // Snap to a valid currency during render (not in an effect) when the
  // available set changes and the current selection is no longer offered.
  // Converges because the new value is always a member of `currencies`.
  if (currencies.length > 0 && !currencies.includes(selectedCurrency)) {
    setSelectedCurrency(currencies[0]);
  }

  const showPeriodToggle =
    options.showPeriodToggle ??
    data?.displaySettings?.showPeriodToggle ??
    true;
  const hasCurrencyFilter = !!currencyFilter && currencyFilter.length > 0;
  const showCurrencySelector = currencies.length > 1;
  const hasCurrency = currencies.length > 1 || hasCurrencyFilter;
  const hasNoUsableCurrency = currencies.length === 0;

  const {
    plans: allPlans,
    addOns: allAddOns,
    periods,
  } = useAvailablePlans(selectedPeriod, {
    useSelectedPeriod: showPeriodToggle,
  });

  // Hide plans/add-ons lacking pricing in the selected currency when a
  // currency is in play. Memoized so a stable reference is handed downstream.
  const plans = React.useMemo(
    () =>
      hasCurrency
        ? allPlans.filter((plan) =>
            planSupportsCurrency(plan, selectedCurrency),
          )
        : allPlans,
    [allPlans, hasCurrency, selectedCurrency],
  );
  const addOns = React.useMemo(
    () =>
      hasCurrency
        ? allAddOns.filter((addOn) =>
            planSupportsCurrency(addOn, selectedCurrency),
          )
        : allAddOns,
    [allAddOns, hasCurrency, selectedCurrency],
  );

  React.useEffect(() => {
    if (typeof data?.component === "undefined") {
      hydratePublic();
    }
  }, [data?.component, hydratePublic]);

  const isStandalone = typeof data?.component === "undefined";
  const canCheckout = isStandalone || (data?.capabilities?.checkout ?? true);

  const currentPeriod =
    getSubscriptionPeriod(data?.company?.billingSubscription) ||
    data?.company?.plan?.planPeriod ||
    "month";

  const getPlanPeriod = React.useCallback(
    (plan: SelectedPlan): string => {
      if (showPeriodToggle) {
        return selectedPeriod;
      }
      if (plan.monthlyPrice) return BillingProductPriceInterval.Month;
      if (plan.quarterlyPrice) return "quarter";
      if (plan.yearlyPrice) return BillingProductPriceInterval.Year;
      return BillingProductPriceInterval.Month;
    },
    [showPeriodToggle, selectedPeriod],
  );

  const isPlanActive = React.useCallback(
    (plan: SelectedPlan, period: string): boolean =>
      !!plan.current && currentPeriod === period,
    [currentPeriod],
  );

  const isAddOnActive = React.useCallback(
    (addOn: SelectedPlan, period: string): boolean => {
      const currentAddOnPeriod =
        getSubscriptionPeriod(data?.company?.billingSubscription) ??
        (data?.company?.addOns ?? []).find(
          (currentAddOn) => currentAddOn.id === addOn.id,
        )?.planPeriod;
      return !!addOn.current && period === currentAddOnPeriod;
    },
    [data?.company?.billingSubscription, data?.company?.addOns],
  );

  const selectPlan = React.useCallback(
    (plan: SelectedPlan) => {
      const period = getPlanPeriod(plan);
      const isActive = isPlanActive(plan, period);

      onCallToAction?.(plan);

      if (!isStandalone && !plan.custom) {
        setCheckoutState({
          period,
          planId: isActive ? null : plan.id,
          usage: false,
        });
      }
    },
    [getPlanPeriod, isPlanActive, onCallToAction, isStandalone, setCheckoutState],
  );

  const selectAddOn = React.useCallback(
    (addOn: SelectedPlan) => {
      const period = getPlanPeriod(addOn);
      const isActive = isAddOnActive(addOn, period);

      onCallToAction?.(addOn);

      if (!isStandalone && !addOn.custom) {
        setCheckoutState({
          period,
          addOnId: isActive ? null : addOn.id,
          usage: false,
        });
      }
    },
    [
      getPlanPeriod,
      isAddOnActive,
      onCallToAction,
      isStandalone,
      setCheckoutState,
    ],
  );

  const currentPlan = plans.find(
    (plan) => plan.id === data?.company?.plan?.id,
  );

  const showCallToAction =
    typeof data?.component !== "undefined" ||
    typeof callToActionUrl === "string" ||
    typeof onCallToAction === "function";

  const resolvedTarget = resolveCallToActionTarget(
    callToActionUrl,
    callToActionTarget,
  );

  return {
    plans,
    addOns,
    periods,
    currencies,
    invalidFilterEntries,
    currentPlan,
    selectedPeriod,
    setSelectedPeriod,
    selectedCurrency,
    setSelectedCurrency,
    isPending,
    hasNoUsableCurrency,
    showPeriodToggle,
    showCurrencySelector,
    hasCurrency,
    isStandalone,
    canCheckout,
    showCallToAction,
    callToActionUrl,
    callToActionTarget: resolvedTarget,
    onCallToAction,
    getPlanPeriod,
    isPlanActive,
    isAddOnActive,
    selectPlan,
    selectAddOn,
  };
}

// === Per-plan context ===

export interface PricingTablePlanContextValue {
  plan: SelectedPlan;
  index: number;
  plans: SelectedPlan[];
  period: string;
  currency?: string;
  isActive: boolean;
  kind: "plan" | "addOn";
}

const [PlanProvider, usePlanContext, PricingTablePlanContext] =
  createPrimitiveContext<PricingTablePlanContextValue>("PricingTable.Plan");

export { PlanProvider, PricingTablePlanContext };

/** Consumer-facing hook for the current plan row. Throws outside a Plan. */
export function usePricingTablePlan(): PricingTablePlanContextValue {
  return usePlanContext("usePricingTablePlan");
}

/**
 * Computes the per-plan derived values (period, currency, active state) from
 * the table controller and publishes them via `PlanProvider` — with no DOM of
 * its own. Reused by both the headless `Plan`/`AddOn` parts and the styled
 * wrappers so the derivation lives in exactly one place.
 */
export function PlanScope({
  plan,
  index = 0,
  plans,
  kind = "plan",
  children,
}: {
  plan: SelectedPlan;
  index?: number;
  plans?: SelectedPlan[];
  kind?: "plan" | "addOn";
  children: React.ReactNode;
}) {
  const ctx = usePricingTable();
  const period = ctx.getPlanPeriod(plan);
  const currency = ctx.hasCurrency ? ctx.selectedCurrency : undefined;
  const isActive =
    kind === "addOn"
      ? ctx.isAddOnActive(plan, period)
      : ctx.isPlanActive(plan, period);
  const fallback = kind === "addOn" ? ctx.addOns : ctx.plans;

  const value = React.useMemo<PricingTablePlanContextValue>(
    () => ({
      plan,
      index,
      plans: plans ?? fallback,
      period,
      currency,
      isActive,
      kind,
    }),
    [plan, index, plans, fallback, period, currency, isActive, kind],
  );

  return <PlanProvider value={value}>{children}</PlanProvider>;
}
PlanScope.displayName = "PricingTable.PlanScope";
