import {
  type BillingCreditBundleView,
  BillingCreditAutoTopupAvailability,
  BillingPlanCreditGrantResetCadence,
  type CompanyPlanCreditGrantView,
  type CreditCompanyGrantView,
  type PlanCreditGrantView,
} from "../../api/checkoutexternal";
import type { Credit, CreditWithCompanyContext } from "../../types";

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

export function groupPlanCreditGrants(creditGrants: PlanCreditGrantView[]) {
  const map = creditGrants.reduce(
    (
      acc: {
        [key: string]: Credit;
      },
      grant,
    ) => {
      const key = grant.creditId;

      acc[key] = {
        id: grant.creditId,
        name: grant.creditName,
        singularName: grant.singularName,
        pluralName: grant.pluralName,
        description: grant.creditDescription,
        icon: grant.creditIcon,
        grantReason: "plan",
        quantity: grant.creditAmount,
        planId: grant.planId,
        planName: grant.plan?.name,
        period: getResetCadencePeriod(grant.resetCadence),
      };

      return acc;
    },
    {},
  );

  return Object.values(map);
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
