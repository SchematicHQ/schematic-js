/** Shared fixtures for view-model builder tests. */
import {
  BillingPriceScheme,
  BillingProductPriceInterval,
  BillingStrategy,
  ChargeType,
  EntitlementValueType,
  FeatureType,
  PlanPriceCadence,
  type CatalogPlanEntitlementResponseData,
  type CatalogPlanResponseData,
  type CatalogPriceResponseData,
} from "../api/public";

import { PricePeriod } from "./period";

const INTERVAL_FOR_PERIOD: Record<PricePeriod, BillingProductPriceInterval> = {
  [PricePeriod.Month]: BillingProductPriceInterval.Month,
  [PricePeriod.OneTime]: BillingProductPriceInterval.OneTime,
  [PricePeriod.Quarter]: BillingProductPriceInterval.Month,
  [PricePeriod.Year]: BillingProductPriceInterval.Year,
};

/**
 * Builds a price in the wire shape from a display period: the server sends
 * interval + interval_count, with quarterly encoded as month×3.
 */
export const price = (
  overrides: Partial<CatalogPriceResponseData> & {
    period: PricePeriod;
    price: number;
  },
): CatalogPriceResponseData => {
  const { period, ...rest } = overrides;
  return {
    currency: "usd",
    id: `bilp_${period}_${overrides.price}`,
    interval: INTERVAL_FOR_PERIOD[period],
    intervalCount: period === PricePeriod.Quarter ? 3 : 1,
    packageSize: 1,
    priceTiers: [],
    scheme: BillingPriceScheme.PerUnit,
    ...rest,
  };
};

export const entitlement = (
  overrides: Partial<CatalogPlanEntitlementResponseData> = {},
): CatalogPlanEntitlementResponseData => ({
  currencyPrices: [],
  featureDescription: "",
  featureIcon: "sparkle",
  featureId: "feat_1",
  featureName: "Seats",
  featureSingularName: "Seat",
  featureType: FeatureType.Trait,
  id: "pltl_1",
  valueType: EntitlementValueType.Numeric,
  ...overrides,
});

export const plan = (
  overrides: Partial<CatalogPlanResponseData> = {},
): CatalogPlanResponseData => ({
  availablePeriods: [PlanPriceCadence.Monthly, PlanPriceCadence.Yearly],
  billingStrategy: BillingStrategy.ProviderManaged,
  chargeType: ChargeType.Recurring,
  // The server sends null for unrestricted plans (= compatible with every
  // plan); default to the wire shape so tests exercise the null path.
  compatiblePlanIds: null,
  currencyPrices: [],
  description: "",
  entitlements: [],
  icon: "rocket",
  id: "plan_1",
  includedCreditGrants: [],
  isTrialable: false,
  monthlyPrice: price({ price: 1000, period: PricePeriod.Month }),
  name: "Starter",
  yearlyPrice: price({ price: 10000, period: PricePeriod.Year }),
  ...overrides,
});
