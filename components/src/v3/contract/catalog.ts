/**
 * The catalog tier of the proposed contract: what is on offer, as served to a
 * publishable key (`Catalog`) or decorated for one company by a temporary
 * access token (`CompanyCatalog`).
 *
 * Conventions (shared by every contract file):
 * - camelCase; RFC3339 timestamps as `Date`; absent as `null`, never
 *   `undefined`, so a missing field is a type error rather than a silent gap.
 * - Money in minor units next to its currency; a `…Decimal` string sibling
 *   where the provider stores sub-minor-unit prices. Nothing pre-formatted.
 * - Each field's comment names the element(s) that read it. A field no
 *   element reads does not exist here.
 */

import type {
  ChargeType,
  CreditExpiryType,
  CreditExpiryUnit,
  CreditGrantScaling,
  CreditResetCadence,
  EntitlementValueType,
  FeatureType,
  MetricPeriod,
  MetricPeriodMonthReset,
  PlanInvalidReason,
  PriceBehavior,
  PriceInterval,
  PriceScheme,
  TiersMode,
} from "./enums";

export interface PlanRef {
  id: string;
  name: string;
}

/** One band of a tiered price, with its range resolved server-side. */
export interface PriceTier {
  /** First unit covered by the band (1-based). PricingTable tier tooltip. */
  from: number;
  /** Last unit covered; `null` = unbounded. PricingTable tier tooltip. */
  to: number | null;
  /** Minor units per unit within the band. PricingTable, MeteredFeatures (overage rate). */
  perUnitAmount: number | null;
  /** Sub-minor-unit per-unit price when the provider stores one. Same readers. */
  perUnitAmountDecimal: string | null;
  /** Flat minor units charged on entering the band. PricingTable tier tooltip. */
  flatAmount: number | null;
}

/**
 * A single price point. Plans and entitlements carry one flat list of these
 * (every currency × cadence they are sold at) instead of per-period slots; the
 * derivations select by `currency` + `derivePeriod(interval, intervalCount)`.
 */
export interface Price {
  /** Stable handle, e.g. for deep-linking a selection into checkout. PricingTable `onSelectPlan`. */
  id: string;
  /** ISO 4217, lowercase as the provider stores it. Every element that formats money. */
  currency: string;
  /** Provider interval as stored. Every element, via `derivePeriod`. */
  interval: PriceInterval;
  /** Multiplier on `interval` (quarterly = month × 3). Every element, via `derivePeriod`. */
  intervalCount: number;
  /** Minor units. Every element that formats money. */
  amount: number;
  /** Decimal string when the provider stores sub-minor-unit amounts (e.g. "0.001"). PricingTable, MeteredFeatures. */
  amountDecimal: string | null;
  /** Units covered per `amount`; 1 = per unit. PricingTable, IncludedFeatures ("$10 per 1,000 units"). */
  packageSize: number;
  /** `per_unit` or `tiered`. PricingTable, IncludedFeatures, MeteredFeatures. */
  scheme: PriceScheme;
  /** `graduated` or `volume` for tiered prices; `null` otherwise. Same readers. */
  tiersMode: TiersMode | null;
  /** Tier bands, empty unless `scheme` is `tiered`. Same readers. */
  tiers: PriceTier[];
}

export interface FeatureRef {
  id: string;
  /** Display name. Every element that names a feature. */
  name: string;
  /** Explicit singular form; `null` = derive. Every element, via `featureName`. */
  singularName: string | null;
  /** Explicit plural form; `null` = derive. Every element, via `featureName`. */
  pluralName: string | null;
  /** Icon name from the schematic-icons set, or an emoji; `null` = none. PricingTable, IncludedFeatures, MeteredFeatures. */
  icon: string | null;
  /** Marketing description; `null` = none. PricingTable, IncludedFeatures (showFeatureDescription). */
  description: string | null;
  /** Drives which element shows the feature. IncludedFeatures, MeteredFeatures. */
  type: FeatureType;
}

export interface CreditRef {
  id: string;
  name: string;
  singularName: string | null;
  pluralName: string | null;
  icon: string | null;
}

/** Credit facts of a credit-burndown entitlement. */
export interface EntitlementCredit extends CreditRef {
  /** Credits consumed per use. PricingTable, IncludedFeatures ("0.5 credits per use"). */
  consumptionRate: number;
  /**
   * ⌊credits included with the plan ÷ consumptionRate⌋, computed server-side;
   * `null` when the plan includes no grant of this credit. PricingTable,
   * IncludedFeatures ("200 messages").
   */
  equivalentLimit: number | null;
}

/**
 * The entitlement display block. Embedded by `Entitlement` (a plan's
 * entitlement, keyed by its ID) and by `FeatureUsageRow` (a company's
 * entitlement, which may come from an override with no plan entitlement ID).
 */
export interface EntitlementDisplay {
  feature: FeatureRef;
  /** PricingTable, IncludedFeatures: selects the value branch. */
  valueType: EntitlementValueType;
  /** Boolean entitlements: whether the feature is on. IncludedFeatures. */
  valueBool: boolean | null;
  /** Numeric entitlements: the included quantity. PricingTable, IncludedFeatures, MeteredFeatures. */
  valueNumeric: number | null;
  /** `null` = not metered. PricingTable, IncludedFeatures, MeteredFeatures: selects the pricing branch. */
  priceBehavior: PriceBehavior | null;
  /** Metered price points across every offered currency × cadence; empty unless metered. PricingTable, IncludedFeatures, MeteredFeatures. */
  meteredPrices: Price[];
  /** Overage entitlements: units included before overage pricing starts. PricingTable, IncludedFeatures, MeteredFeatures. */
  softLimit: number | null;
  /** Credit-burndown entitlements only. PricingTable, IncludedFeatures. */
  credit: EntitlementCredit | null;
  /** Usage reset cadence for event features. PricingTable, IncludedFeatures ("per month"). */
  metricPeriod: MetricPeriod | null;
  /** When `metricPeriod` is `current_month`: first-of-month or billing-cycle reset. IncludedFeatures. */
  metricPeriodMonthReset: MetricPeriodMonthReset | null;
  /** Configured warning tier as a unit count; `null` = none. MeteredFeatures, IncludedFeatures (showWarningThresholdAsLimit). */
  warningThreshold: number | null;
}

/** A plan's entitlement. */
export interface Entitlement extends EntitlementDisplay {
  /** Plan entitlement ID — the stable row key. PricingTable. */
  id: string;
}

/** A credit amount included with a plan. */
export interface CreditGrant {
  id: string;
  credit: CreditRef;
  /** Credits per grant (per license unit when `scaling` is `per_license`). PricingTable, PlanManager. */
  amount: number;
  /** Flat credits granted to the company regardless of scaling. PricingTable, PlanManager. */
  companyAmount: number;
  /** PricingTable, PlanManager: per-seat copy. */
  scaling: CreditGrantScaling;
  /** The seat feature a per-license grant scales with; `null` when fixed. PricingTable, PlanManager. */
  licenseId: string | null;
  /** How often the grant renews; `null` = never. PricingTable, PlanManager ("per month"). */
  resetCadence: CreditResetCadence | null;
}

/** A plan or add-on as offered by the catalog. Anonymous-safe by invariant. */
export interface CatalogPlan {
  id: string;
  /** PricingTable, PlanManager. */
  name: string;
  /** PricingTable (showDescription). */
  description: string;
  /** Icon name or emoji; "" when unset. PricingTable. */
  icon: string;
  /** `free` / `recurring` / `one_time`. PricingTable: price branch and period handling. */
  chargeType: ChargeType;
  /**
   * Every price point the plan is sold at: one per currency × cadence for
   * recurring plans, one per currency for one-time plans, empty for free
   * plans. Already gated server-side to the cadences actually on sale.
   * PricingTable.
   */
  prices: Price[];
  /** Pre-ordered and visibility-filtered server-side. PricingTable. */
  entitlements: Entitlement[];
  /** PricingTable: trial CTA. */
  isTrialable: boolean;
  /** PricingTable: trial CTA copy. */
  trialDays: number | null;
  /** Add-ons: `null` = compatible with every plan; a populated list is exact. PricingTable, CreditUsage. */
  compatiblePlanIds: string[] | null;
  /** PricingTable (showCredits), PlanManager. */
  includedCreditGrants: CreditGrant[];
}

export interface UsageViolation {
  featureId: string;
  /** PricingTable: "Over the limit for {feature}". */
  featureName: string;
  usage: number;
  /** The limit the target plan would impose; `null` = unlimited. */
  limit: number | null;
}

/** A plan decorated for one company. */
export interface CompanyCatalogPlan extends CatalogPlan {
  /** PricingTable: current-plan badge, CTA replacement. */
  current: boolean;
  /**
   * The price the company is subscribed at, when `current`; `null` for a
   * current free plan. PricingTable: "Current plan" only at the subscribed
   * period and currency — another period of the same plan is selectable.
   * Not in RFC 0007 (the hydrate path compares the subscription period).
   */
  currentPriceId: string | null;
  /** PricingTable: CTA enabled/disabled. */
  valid: boolean;
  /** PricingTable: disabled reason copy. */
  invalidReason: PlanInvalidReason | null;
  /** PricingTable: trial CTA gating. */
  companyCanTrial: boolean;
  /** PricingTable: over-limit detail. */
  usageViolations: UsageViolation[];
}

/** A credit bundle on offer. */
export interface CreditBundle {
  id: string;
  /** CreditUsage. */
  name: string;
  credit: CreditRef;
  /** Credits per bundle; `null` = custom quantity (priced per credit via `unitPrices`). CreditUsage. */
  quantity: number | null;
  /** Bundle price per currency (fixed-quantity bundles). CreditUsage. */
  prices: Price[];
  /** Per-credit price per currency (custom-quantity bundles). CreditUsage. */
  unitPrices: Price[];
  /**
   * Plans on which the bundle may be bought; `null` = any plan. CreditUsage:
   * "Buy more" gating against the company's current plan. Not in RFC 0007.
   */
  compatiblePlanIds: string[] | null;
  /** Expiry of bought credits. CreditUsage. */
  expiry: {
    type: CreditExpiryType;
    unit: CreditExpiryUnit;
    unitCount: number | null;
  };
}

/** Custom-plan call to action. `null` on the catalog when hidden. */
export interface CustomPlanCta {
  /** PricingTable. */
  text: string | null;
  /** PricingTable. */
  url: string | null;
  /** PricingTable: rendered in the price slot. */
  priceText: string | null;
}

export interface CatalogCapabilities {
  /** Whether plan-change CTAs may render at all. PricingTable, PlanManager, MeteredFeatures, CreditUsage. */
  checkout: boolean;
}

/** The public tier: the offering, as served to a publishable key. */
export interface Catalog {
  id: string;
  name: string;
  description: string | null;
  /** Hosted pricing page; `null` = none. PricingTable (custom-plan CTA fallback). */
  pricingUrl: string | null;
  /** Present = show the custom-plan card. PricingTable. */
  customPlanCta: CustomPlanCta | null;
  capabilities: CatalogCapabilities;
  /** ISO 4217 of the catalog's default price slots. PricingTable: initial currency selection. */
  defaultCurrency: string;
  /** In catalog order. PricingTable. */
  plans: CatalogPlan[];
  /** In catalog order. PricingTable. */
  addOns: CatalogPlan[];
  /** In catalog order. CreditUsage. */
  creditBundles: CreditBundle[];
}

/** Checkout behavior configured on the catalog — meaningless without a company. */
export interface CheckoutBehavior {
  /** PricingTable, PlanManager: downgrade CTAs blocked. */
  preventSelfServiceDowngrade: boolean;
  /** PricingTable, PlanManager: replacement CTA label. */
  preventSelfServiceDowngradeButtonText: string | null;
  /** PricingTable, PlanManager: replacement CTA destination. */
  preventSelfServiceDowngradeUrl: string | null;
  /** Plan a trialing company lands on when its trial ends. PlanManager trial notice. */
  trialExpiryPlan: PlanRef | null;
  /** PricingTable: trial CTA copy. */
  trialPaymentMethodRequired: boolean | null;
}

/** The end-user tier: the catalog as seen by one company. */
export interface CompanyCatalog extends Omit<Catalog, "addOns" | "plans"> {
  plans: CompanyCatalogPlan[];
  addOns: CompanyCatalogPlan[];
  checkoutBehavior: CheckoutBehavior;
}

/** Either tier; derivations narrow on `"checkoutBehavior" in catalog`. */
export type AnyCatalog = Catalog | CompanyCatalog;

export const isCompanyCatalog = (
  catalog: AnyCatalog,
): catalog is CompanyCatalog => "checkoutBehavior" in catalog;
