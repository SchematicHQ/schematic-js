import {
  BillingCreditBundleStatus,
  BillingPriceUsageType,
  BillingProviderType,
  BillingStrategy,
  ChargeType,
  PlanType,
  type BillingCreditBundleView,
  type BillingPriceResponseData,
  type BillingPriceView,
  type BillingProductPriceResponseData,
  type CatalogCompanyPlanResponseData,
  type CatalogCreditBundleResponseData,
  type CatalogCurrencyPricesResponseData,
  type CatalogPlanEntitlementResponseData,
  type CatalogPriceResponseData,
  type CompanyCatalogResponseData,
  type CompanyPlanDetailResponseData,
  type CompatiblePlans,
  type ComponentCheckoutSettings,
  type EntitlementCurrencyPricesResponseData,
  type PlanCurrencyPricesResponseData,
  type PlanEntitlementResponseData,
  type PlanIcon,
} from "../../api/checkoutexternal";

/**
 * Spike adapter: projects the /catalog/view response onto the hydrate-shaped
 * slices the embed already consumes, so the checkout flow can run on the new
 * API without porting every component to a new contract.
 *
 * Every value this module fabricates (or drops) is an impedance mismatch
 * between the two surfaces; each fabrication site calls `recordGap` with the
 * corresponding row number in ../../../gaps-in-checkout-api.cm.md so runtime
 * usage self-reports which gaps a given catalog actually exercises.
 */

interface RecordedGap {
  gap: number;
  detail: string;
}

const recordedGaps = new Map<string, RecordedGap>();

export function recordGap(gap: number, detail: string) {
  const key = `${gap}:${detail}`;
  if (recordedGaps.has(key)) {
    return;
  }

  recordedGaps.set(key, { gap, detail });

  // eslint-disable-next-line no-console
  console.warn(`[catalogAdapter] gap #${gap}: ${detail}`);
}

export function getRecordedGaps(): RecordedGap[] {
  return [...recordedGaps.values()];
}

export function resetRecordedGaps() {
  recordedGaps.clear();
}

// Sentinel for legacy-required timestamps the catalog (correctly) does not
// expose. Anything rendering these dates from catalog-sourced plans is itself
// a find: the embed should not depend on them in checkout.
const CATALOG_EPOCH = new Date(0);

function toBillingPrice(
  price: CatalogPriceResponseData,
): BillingPriceResponseData {
  recordGap(
    21,
    "fabricating external_price_id/provider_type on a catalog price",
  );

  return {
    currency: price.currency,
    externalPriceId: "",
    id: price.id,
    interval: price.interval,
    intervalCount: price.intervalCount,
    nickname: null,
    price: price.price,
    priceDecimal: price.priceDecimal,
    providerType: BillingProviderType.Stripe,
    scheme: price.scheme,
  };
}

function toBillingPriceView(price: CatalogPriceResponseData): BillingPriceView {
  recordGap(7, "no price tiers on catalog prices; tiered display impossible");

  return {
    billingScheme: price.scheme,
    createdAt: CATALOG_EPOCH,
    currency: price.currency,
    id: price.id,
    interval: price.interval,
    intervalCount: price.intervalCount,
    isActive: true,
    packageSize: price.packageSize,
    price: price.price,
    priceDecimal: price.priceDecimal,
    priceExternalId: "",
    priceId: price.id,
    priceTier: [],
    productExternalId: "",
    productId: "",
    productName: "",
    providerType: BillingProviderType.Stripe,
    updatedAt: CATALOG_EPOCH,
    usageType: BillingPriceUsageType.Metered,
  };
}

function toBillingProductPrice(
  price: CatalogPriceResponseData,
): BillingProductPriceResponseData {
  return {
    billingScheme: price.scheme,
    createdAt: CATALOG_EPOCH,
    currency: price.currency,
    id: price.id,
    interval: price.interval,
    intervalCount: price.intervalCount,
    isActive: true,
    packageSize: price.packageSize,
    price: price.price,
    priceDecimal: price.priceDecimal,
    priceExternalId: "",
    productExternalId: "",
    providerType: BillingProviderType.Stripe,
    updatedAt: CATALOG_EPOCH,
    usageType: BillingPriceUsageType.Licensed,
  };
}

function toPlanCurrencyPrices(
  prices: CatalogCurrencyPricesResponseData,
): PlanCurrencyPricesResponseData {
  return {
    currency: prices.currency,
    ...(prices.monthlyPrice && {
      monthlyPrice: toBillingPrice(prices.monthlyPrice),
    }),
    ...(prices.quarterlyPrice && {
      quarterlyPrice: toBillingPrice(prices.quarterlyPrice),
    }),
    ...(prices.yearlyPrice && {
      yearlyPrice: toBillingPrice(prices.yearlyPrice),
    }),
    ...(prices.oneTimePrice && {
      oneTimePrice: toBillingPrice(prices.oneTimePrice),
    }),
  };
}

function toEntitlementCurrencyPrices(
  prices: CatalogCurrencyPricesResponseData,
): EntitlementCurrencyPricesResponseData {
  return {
    currency: prices.currency,
    ...(prices.monthlyPrice && {
      monthlyPrice: toBillingPriceView(prices.monthlyPrice),
    }),
    ...(prices.quarterlyPrice && {
      quarterlyPrice: toBillingPriceView(prices.quarterlyPrice),
    }),
    ...(prices.yearlyPrice && {
      yearlyPrice: toBillingPriceView(prices.yearlyPrice),
    }),
  };
}

function toPlanEntitlement(
  entitlement: CatalogPlanEntitlementResponseData,
  planId: string,
): PlanEntitlementResponseData {
  recordGap(
    7,
    "catalog entitlements are pricing-only; fabricating display fields " +
      "(feature detail, value type, soft limit, warning tiers)",
  );

  return {
    billingThreshold: null,
    createdAt: CATALOG_EPOCH,
    currencyPrices: entitlement.currencyPrices.map(toEntitlementCurrencyPrices),
    // The catalog exposes only the feature id and name; synthesize a minimal
    // feature so name-only rendering works.
    feature: {
      createdAt: CATALOG_EPOCH,
      description: "",
      featureType: "event",
      icon: "",
      id: entitlement.featureId,
      name: entitlement.featureName,
      updatedAt: CATALOG_EPOCH,
    },
    featureId: entitlement.featureId,
    id: entitlement.id,
    ...(entitlement.meteredMonthlyPrice && {
      meteredMonthlyPrice: toBillingPriceView(entitlement.meteredMonthlyPrice),
    }),
    ...(entitlement.meteredQuarterlyPrice && {
      meteredQuarterlyPrice: toBillingPriceView(
        entitlement.meteredQuarterlyPrice,
      ),
    }),
    ...(entitlement.meteredYearlyPrice && {
      meteredYearlyPrice: toBillingPriceView(entitlement.meteredYearlyPrice),
    }),
    planId,
    priceBehavior: entitlement.priceBehavior,
    ruleId: "",
    environmentId: "",
    softLimit: null,
    updatedAt: CATALOG_EPOCH,
    usageQuantity: entitlement.usageQuantity,
    valueNumeric: null,
    valueTraitId: null,
    valueType: "unknown",
    warningTiers: [],
  };
}

/**
 * Derives the legacy charge type from which price slots the catalog offers:
 * any recurring slot means recurring, a lone one-time slot means one-time,
 * and no prices at all reads as free.
 */
function deriveChargeType(plan: CatalogCompanyPlanResponseData): ChargeType {
  recordGap(8, "no charge_type on catalog plans; deriving from price slots");

  if (plan.monthlyPrice || plan.quarterlyPrice || plan.yearlyPrice) {
    return ChargeType.Recurring;
  }

  if (plan.oneTimePrice) {
    return ChargeType.OneTime;
  }

  return ChargeType.Free;
}

/**
 * Maps the new compatibility semantics (null = all plans, [] = none) onto the
 * legacy encoding, where an empty list means "all". "None" is inexpressible in
 * the legacy shape, so such add-ons must be dropped by the caller; this
 * returns undefined to signal that.
 */
function toLegacyCompatiblePlanIds(
  compatiblePlanIds: Array<string> | null | undefined,
): Array<string> | undefined {
  if (compatiblePlanIds == null) {
    // New: null = compatible with every plan. Legacy: [] = the same.
    return [];
  }

  if (compatiblePlanIds.length === 0) {
    recordGap(
      6,
      "add-on compatible with no plans is inexpressible in the legacy " +
        "shape; dropping it",
    );
    return undefined;
  }

  return compatiblePlanIds;
}

function toCompanyPlanDetail(
  plan: CatalogCompanyPlanResponseData,
  planType: PlanType,
  compatiblePlanIds: Array<string>,
): CompanyPlanDetailResponseData {
  recordGap(
    1,
    "no included_credit_grants on catalog plans; auto-top-up stage cannot run",
  );
  recordGap(
    8,
    "fabricating is_free/is_default/is_custom/usage_violations for a " +
      "catalog plan",
  );

  const monthlyPrice = plan.monthlyPrice && toBillingPrice(plan.monthlyPrice);
  const quarterlyPrice =
    plan.quarterlyPrice && toBillingPrice(plan.quarterlyPrice);
  const yearlyPrice = plan.yearlyPrice && toBillingPrice(plan.yearlyPrice);
  const oneTimePrice = plan.oneTimePrice && toBillingPrice(plan.oneTimePrice);

  return {
    audienceType: null,
    availablePeriods: plan.availablePeriods,
    billingStrategy: BillingStrategy.ProviderManaged,
    chargeType: deriveChargeType(plan),
    companyCanTrial: plan.companyCanTrial,
    companyCount: 0,
    compatiblePlanIds,
    controlledBy: BillingProviderType.Schematic,
    createdAt: CATALOG_EPOCH,
    credits: [],
    currencyPrices: plan.currencyPrices.map(toPlanCurrencyPrices),
    current: plan.current,
    custom: false,
    description: plan.description,
    entitlements: plan.entitlements.map((entitlement) =>
      toPlanEntitlement(entitlement, plan.id),
    ),
    features: [],
    icon: plan.icon as PlanIcon,
    id: plan.id,
    includedCreditGrants: [],
    invalidReason: plan.invalidReason,
    isCustom: false,
    isDefault: false,
    isFree: !monthlyPrice && !quarterlyPrice && !yearlyPrice && !oneTimePrice,
    isTrialable: plan.isTrialable,
    ...(monthlyPrice && { monthlyPrice }),
    name: plan.name,
    ...(oneTimePrice && { oneTimePrice }),
    planType,
    ...(quarterlyPrice && { quarterlyPrice }),
    trialDays: plan.trialDays,
    updatedAt: CATALOG_EPOCH,
    usageViolations: [],
    valid: plan.valid,
    versions: [],
    ...(yearlyPrice && { yearlyPrice }),
  };
}

function toCreditBundleView(
  bundle: CatalogCreditBundleResponseData,
): BillingCreditBundleView {
  recordGap(
    23,
    "no compatible_plan_ids on catalog credit bundles; per-plan bundle " +
      "filtering (#1661) cannot run",
  );

  return {
    bundleType: bundle.bundleType,
    // Legacy semantics: empty = compatible with every plan.
    compatiblePlanIds: [],
    createdAt: CATALOG_EPOCH,
    creditIcon: bundle.creditIcon,
    creditId: bundle.creditId,
    creditName: bundle.creditName,
    currencyPrices: bundle.currencyPrices.map((currencyPrice) => ({
      currency: currencyPrice.currency,
      ...(currencyPrice.price && {
        price: toBillingPriceView(currencyPrice.price),
      }),
    })),
    expiryType: bundle.expiryType,
    expiryUnit: bundle.expiryUnit,
    expiryUnitCount: bundle.expiryUnitCount,
    hasGrants: false,
    id: bundle.id,
    name: bundle.name,
    pluralName: bundle.pluralName,
    ...(bundle.price && { price: toBillingProductPrice(bundle.price) }),
    quantity: bundle.quantity,
    singularName: bundle.singularName,
    status: BillingCreditBundleStatus.Active,
    ...(bundle.unitPrice && {
      unitPrice: toBillingProductPrice(bundle.unitPrice),
    }),
    updatedAt: CATALOG_EPOCH,
  };
}

export interface CatalogOverlay {
  activePlans: CompanyPlanDetailResponseData[];
  activeAddOns: CompanyPlanDetailResponseData[];
  addOnCompatibilities: CompatiblePlans[];
  creditBundles: BillingCreditBundleView[];
  checkoutSettings: ComponentCheckoutSettings;
  preventSelfServiceDowngrade: boolean;
  preventSelfServiceDowngradeUrl?: string | null;
  preventSelfServiceDowngradeButtonText?: string | null;
  trialPaymentMethodRequired: boolean;
}

/**
 * Projects a /catalog/view response onto the hydrate slices the embed
 * consumes. The result is overlaid onto `EmbedState.data` when the
 * experimental checkouts API seam is enabled.
 */
export function adaptCatalog(
  catalog: CompanyCatalogResponseData,
): CatalogOverlay {
  const activePlans = catalog.plans.map((plan) =>
    toCompanyPlanDetail(
      plan,
      PlanType.Plan,
      // Plan-to-plan compatibility does not exist in either surface.
      [],
    ),
  );

  const activeAddOns: CompanyPlanDetailResponseData[] = [];
  const addOnCompatibilities: CompatiblePlans[] = [];
  for (const addOn of catalog.addOns) {
    const compatiblePlanIds = toLegacyCompatiblePlanIds(
      addOn.compatiblePlanIds,
    );
    if (compatiblePlanIds === undefined) {
      // Compatible with nothing: inexpressible in the legacy shape (gap #6).
      continue;
    }

    activeAddOns.push(
      toCompanyPlanDetail(addOn, PlanType.AddOn, compatiblePlanIds),
    );
    if (compatiblePlanIds.length > 0) {
      addOnCompatibilities.push({
        sourcePlanId: addOn.id,
        compatiblePlanIds,
      });
    }
  }

  return {
    activePlans,
    activeAddOns,
    addOnCompatibilities,
    creditBundles: catalog.creditBundles.map(toCreditBundleView),
    // The catalog settings shape matches the legacy component settings 1:1.
    checkoutSettings: catalog.checkoutSettings,
    preventSelfServiceDowngrade: catalog.preventSelfServiceDowngrade,
    preventSelfServiceDowngradeUrl: catalog.preventSelfServiceDowngradeUrl,
    preventSelfServiceDowngradeButtonText:
      catalog.preventSelfServiceDowngradeButtonText,
    // Null means required, per the API contract.
    trialPaymentMethodRequired: catalog.trialPaymentMethodRequired ?? true,
  };
}
