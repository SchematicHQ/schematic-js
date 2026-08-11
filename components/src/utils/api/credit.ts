import type { TFunction } from "i18next";

import {
  type BillingCreditBundleView,
  BillingCreditAutoTopupAvailability,
  BillingCreditExpiryType,
  BillingCreditExpiryUnit,
  BillingPlanCreditGrantResetCadence,
  type CompanyPlanCreditGrantView,
  type CreditCompanyGrantView,
  PlanCreditGrantScaling,
  type PlanCreditGrantView,
} from "../../api/checkoutexternal";
import type { Credit, CreditWithCompanyContext } from "../../types";
import { pluralize } from "../pluralize";

function getResetCadencePeriod(cadence: PlanCreditGrantView["resetCadence"]) {
  switch (cadence) {
    case BillingPlanCreditGrantResetCadence.Yearly:
      return "year";
    case BillingPlanCreditGrantResetCadence.Monthly:
      return "month";
    case BillingPlanCreditGrantResetCadence.Weekly:
      return "week";
    case BillingPlanCreditGrantResetCadence.Daily:
      return "day";
  }
}

function isPerLicenseGrant(
  grant: Pick<PlanCreditGrantView, "scaling" | "licenseId">,
) {
  return (
    grant.scaling === PlanCreditGrantScaling.PerLicense && !!grant.licenseId
  );
}

/**
 * A plan can carry multiple grants on the same credit: a per-license grant
 * (credits × license quantity) alongside flat company-level grants. Grants are
 * grouped per credit; `fixedQuantity` sums the flat portions and
 * `perLicenseGrants` carries each per-license portion's per-unit amount.
 * `quantity` is the flat portion only — use {@link resolvePlanCreditQuantity}
 * to compute the effective total once license quantities are known.
 */
export function groupPlanCreditGrants(creditGrants: PlanCreditGrantView[]) {
  const map = creditGrants.reduce(
    (
      acc: {
        [key: string]: Credit;
      },
      grant,
    ) => {
      const key = grant.creditId;
      const current = acc[key];

      const perLicense = isPerLicenseGrant(grant)
        ? // isPerLicenseGrant guarantees licenseId is set
          [{ amount: grant.creditAmount, licenseId: grant.licenseId! }]
        : [];
      const fixedQuantity = isPerLicenseGrant(grant) ? 0 : grant.creditAmount;

      acc[key] = {
        id: grant.creditId,
        name: grant.creditName,
        singularName: grant.singularName,
        pluralName: grant.pluralName,
        description: grant.creditDescription,
        icon: grant.creditIcon,
        grantReason: "plan",
        quantity: (current?.quantity ?? 0) + fixedQuantity,
        fixedQuantity: (current?.fixedQuantity ?? 0) + fixedQuantity,
        perLicenseGrants: [...(current?.perLicenseGrants ?? []), ...perLicense],
        planId: grant.planId,
        planName: grant.plan?.name,
        period: getResetCadencePeriod(grant.resetCadence) ?? current?.period,
      };

      return acc;
    },
    {},
  );

  return Object.values(map);
}

/**
 * Resolves a grouped plan credit's effective total: flat portion plus each
 * per-license portion multiplied by its license quantity. Returns `undefined`
 * when any per-license portion's quantity cannot be resolved, so callers can
 * fall back to per-unit copy instead of asserting a wrong total.
 */
export function resolvePlanCreditQuantity(
  credit: Pick<Credit, "fixedQuantity" | "perLicenseGrants">,
  resolveLicenseQuantity: (licenseId: string) => number | undefined,
): number | undefined {
  let total = credit.fixedQuantity;

  for (const grant of credit.perLicenseGrants) {
    const licenseQuantity = resolveLicenseQuantity(grant.licenseId);
    if (typeof licenseQuantity !== "number") {
      return undefined;
    }

    total += grant.amount * licenseQuantity;
  }

  return total;
}

/**
 * The per-license grants that scale with the given license feature. Used by
 * license feature rows (included features, checkout quantity step) to surface
 * the credits granted per unit.
 */
export function getPerLicenseGrantsForFeature<
  T extends Pick<PlanCreditGrantView, "scaling" | "licenseId">,
>(creditGrants: T[] = [], feature?: { licenseId?: string | null } | null): T[] {
  const licenseId = feature?.licenseId;
  if (!licenseId) {
    return [];
  }

  return creditGrants.filter(
    (grant) => isPerLicenseGrant(grant) && grant.licenseId === licenseId,
  );
}

/**
 * Finds the entitlement (or feature usage entry) whose feature is the license
 * driving a per-license credit grant — the seat-count source for resolving the
 * grant's effective total.
 */
export function findLicenseSource<
  T extends { feature?: { licenseId?: string | null } | null },
>(sources: T[] = [], licenseId?: string | null): T | undefined {
  if (!licenseId) {
    return undefined;
  }

  return sources.find((source) => source.feature?.licenseId === licenseId);
}

interface GroupCreditGrantOptions {
  groupBy?: "credit" | "bundle";
}

export function groupCreditGrants(
  creditGrants: CreditCompanyGrantView[],
  options?: GroupCreditGrantOptions,
) {
  const today = new Date();
  const map = creditGrants.reduce(
    (
      acc: {
        [key: string]: CreditWithCompanyContext;
      },
      grant,
    ) => {
      const isExpired = !!grant.expiresAt && grant.expiresAt <= today;
      const isZeroedOut = !!grant.zeroedOutDate;

      if (!isExpired && !isZeroedOut) {
        const key =
          options?.groupBy === "bundle"
            ? grant.billingCreditBundleId || grant.id
            : options?.groupBy === "credit"
              ? grant.billingCreditId
              : grant.id;
        const current = acc[key];

        acc[key] = {
          // credit-specific attributes
          id: grant.billingCreditId,
          name: grant.creditName,
          singularName: grant.singularName,
          pluralName: grant.pluralName,
          description: grant.creditDescription,
          icon: grant.creditIcon,
          grantReason: grant.grantReason,
          quantity: grant.quantity,
          // shared attributes
          companyId: grant.companyId,
          companyName: grant.companyName,
          planId: grant.planId,
          planName: grant.planName,
          bundleId: grant.billingCreditBundleId,
          // custom attributes
          total: {
            value: (current?.total?.value ?? 0) + grant.quantity,
            remaining:
              (current?.total?.remaining ?? 0) + grant.quantityRemaining,
            used: (current?.total?.used ?? 0) + grant.quantityUsed,
          },
          grants: [...(current?.grants ?? []), grant],
        };
      }

      return acc;
    },
    {},
  );

  return Object.values(map);
}

export function isAutoTopupEnabled(grant?: CompanyPlanCreditGrantView) {
  if (grant?.billingCreditAutoTopupSelfService) {
    return grant.companyAutoTopupEnabled ?? false;
  }

  return grant?.billingCreditAutoTopupEnabled ?? false;
}

export function isAutoTopupOff(
  grant?: Pick<
    CompanyPlanCreditGrantView,
    "billingCreditAutoTopupAvailability"
  >,
) {
  return (
    grant?.billingCreditAutoTopupAvailability ===
    BillingCreditAutoTopupAvailability.Off
  );
}

/**
 * A credit grant's self-service auto top-up controls are available only when the
 * grant opts into self-service *and* its availability isn't `off`. Centralized so
 * every surface (PlanManager notice/rows, AutoTopup card, checkout stage) gates
 * identically and can't drift if the semantics change.
 */
export function isSelfServiceAutoTopupAvailable(
  grant?: Pick<
    CompanyPlanCreditGrantView,
    "billingCreditAutoTopupSelfService" | "billingCreditAutoTopupAvailability"
  >,
) {
  return !!grant?.billingCreditAutoTopupSelfService && !isAutoTopupOff(grant);
}

export function isBundlePurchaseOff(
  grant?: Partial<
    Pick<CompanyPlanCreditGrantView, "billingCreditCanBuyBundles">
  >,
) {
  return grant?.billingCreditCanBuyBundles === false;
}

type BundleGatingGrant = Pick<PlanCreditGrantView, "creditId"> &
  Partial<Pick<PlanCreditGrantView, "billingCreditCanBuyBundles">>;

/** The set of credit ids whose grant has bundle purchase turned off. */
export function getBundleOffCreditIds(
  grants?: BundleGatingGrant[],
): Set<string> {
  const ids = new Set<string>();
  (grants ?? []).forEach((grant) => {
    if (isBundlePurchaseOff(grant)) {
      ids.add(grant.creditId);
    }
  });
  return ids;
}

/** Drops bundles whose credit has bundle purchase off on the given plan's grants. */
export function filterCreditBundles<
  T extends Pick<BillingCreditBundleView, "creditId">,
>(grants: BundleGatingGrant[] | undefined, bundles: T[] | undefined): T[] {
  const bundleOffCreditIds = getBundleOffCreditIds(grants);
  return (bundles ?? []).filter(
    (bundle) => !bundleOffCreditIds.has(bundle.creditId),
  );
}

/**
 * Filters bundles by the plan's bundle-off gating and resolves each surviving
 * bundle's `count` from the supplied counts map (keyed by bundle id).
 */
export function deriveCreditBundles<
  T extends Pick<BillingCreditBundleView, "id" | "creditId">,
>(
  grants: BundleGatingGrant[] | undefined,
  bundles: T[] | undefined,
  counts: Record<string, number>,
): (T & { count: number })[] {
  return filterCreditBundles(grants, bundles).map((bundle) => ({
    ...bundle,
    count: counts[bundle.id] ?? 0,
  }));
}

export function getAutoTopupThresholdCredits(
  grant?: CompanyPlanCreditGrantView,
) {
  return (
    grant?.companyAutoTopupThresholdCredits ??
    grant?.billingCreditAutoTopupThresholdCredits
  );
}

export function getAutoTopupAmount(grant?: CompanyPlanCreditGrantView) {
  return grant?.companyAutoTopupAmount ?? grant?.billingCreditAutoTopupAmount;
}

export function mergeAutoTopupOverrides(
  grant: PlanCreditGrantView,
  companyGrant?: CompanyPlanCreditGrantView,
) {
  if (!companyGrant) {
    return grant;
  }

  const resolvedGrant: PlanCreditGrantView = {
    ...grant,
    billingCreditAutoTopupEnabled:
      companyGrant.companyAutoTopupEnabled ??
      grant.billingCreditAutoTopupEnabled,
    billingCreditAutoTopupThresholdCredits:
      companyGrant.companyAutoTopupThresholdCredits ??
      grant.billingCreditAutoTopupThresholdCredits,
    billingCreditAutoTopupAmount:
      companyGrant.companyAutoTopupAmount ?? grant.billingCreditAutoTopupAmount,
  };

  return resolvedGrant;
}

export function formatBundleExpiry(
  bundle: Pick<
    BillingCreditBundleView,
    "expiryType" | "expiryUnit" | "expiryUnitCount"
  >,
  t: TFunction,
): string | undefined {
  switch (bundle.expiryType) {
    case BillingCreditExpiryType.Duration: {
      if (typeof bundle.expiryUnitCount !== "number") {
        return undefined;
      }

      const unit =
        bundle.expiryUnit === BillingCreditExpiryUnit.BillingPeriods
          ? t("billing period")
          : t("day");

      return t("expires after purchase", {
        amount: bundle.expiryUnitCount,
        unit: pluralize(unit, bundle.expiryUnitCount),
      });
    }
    case BillingCreditExpiryType.EndOfBillingPeriod:
      return t("expires at the end of the billing period");
    case BillingCreditExpiryType.EndOfNextBillingPeriod:
      return t("expires at the end of the next billing period");
    case BillingCreditExpiryType.EndOfTrial:
      return t("expires at the end of the trial");
    default:
      return undefined;
  }
}

export function mergeCompanyGrants(
  grants: PlanCreditGrantView[] = [],
  companyGrants?: CompanyPlanCreditGrantView[],
) {
  return grants.map((grant) => {
    const match = companyGrants?.find(
      (companyGrant) => grant.id === companyGrant.id,
    );

    return mergeAutoTopupOverrides(grant, match);
  });
}
