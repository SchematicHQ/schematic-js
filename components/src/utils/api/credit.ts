import { type TFunction } from "i18next";

import {
  BillingCreditAutoTopupAvailability,
  BillingCreditExpiryType,
  BillingCreditExpiryUnit,
  BillingPlanCreditGrantResetCadence,
  PlanCreditGrantScaling,
  type BillingCreditBundleView,
  type CompanyPlanCreditGrantView,
  type CreditCompanyGrantView,
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

/**
 * Whether the grant scales with a license's quantity. Keyed on `scaling`
 * alone: a grant that declares per-license scaling without naming a license
 * still grants `creditAmount` per unit, and reading it as a flat grant would
 * both mislabel that amount and discard `companyCreditAmount`.
 */
function isPerLicenseGrant(grant: Pick<PlanCreditGrantView, "scaling">) {
  return grant.scaling === PlanCreditGrantScaling.PerLicense;
}

/**
 * A per-license grant carries both portions on the same grant: `creditAmount`
 * is the amount issued per license unit, and `companyCreditAmount` is the flat
 * amount granted once per company on top of it (always 0 on a fixed grant,
 * whose whole `creditAmount` is the flat portion). Grants are grouped per
 * credit; `fixedQuantity` sums the flat portions and `perLicenseGrants`
 * carries each per-license portion's per-unit amount. `quantity` is the flat
 * portion only — use {@link resolvePlanCreditQuantity} to compute the
 * effective total once license quantities are known.
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
        ? [
            {
              amount: grant.creditAmount,
              licenseId: grant.licenseId ?? undefined,
            },
          ]
        : [];
      const fixedQuantity = isPerLicenseGrant(grant)
        ? (grant.companyCreditAmount ?? 0)
        : grant.creditAmount;

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
    // An unnamed license has no quantity to look up, so the total is
    // unresolvable — the same outcome as a license the caller cannot resolve.
    const licenseQuantity = grant.licenseId
      ? resolveLicenseQuantity(grant.licenseId)
      : undefined;
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

/**
 * The one license among the sources, when there is exactly one. A grant that
 * declares per-license scaling without naming a license still scales by that
 * license if the plan sells only one, so per-unit copy can name it instead of
 * falling back to the generic word. Returns `undefined` when the plan sells
 * no license or more than one, because either case leaves the license
 * ambiguous.
 */
export function findSoleLicenseSource<
  T extends { feature?: { licenseId?: string | null } | null },
>(sources: T[] = []): T | undefined {
  const licensed = sources.filter((source) => !!source.feature?.licenseId);

  return licensed.length === 1 ? licensed[0] : undefined;
}

/** Comparator ordering anything with a `createdAt` newest-first. */
function byRecency(a: { createdAt: Date }, b: { createdAt: Date }) {
  return +b.createdAt - +a.createdAt;
}

/**
 * Rolls active grants up into per-key totals. The `grants` within each entry
 * come back newest-first, so a truncated ledger shows the most recent without
 * the caller sorting anything; entries themselves keep the order their first
 * grant arrived in, which callers are free to re-sort.
 *
 * "Active" is load-bearing: expired and zeroed-out grants are dropped, so a
 * caller counting the result is counting live grants only.
 */
function aggregateActiveGrants(
  creditGrants: CreditCompanyGrantView[],
  getKey: (grant: CreditCompanyGrantView) => string,
): CreditWithCompanyContext[] {
  const today = new Date();
  const map = creditGrants.reduce(
    (
      acc: {
        [key: string]: CreditCompanyGrantView[];
      },
      grant,
    ) => {
      const isExpired = !!grant.expiresAt && grant.expiresAt <= today;
      const isZeroedOut = !!grant.zeroedOutDate;

      if (!isExpired && !isZeroedOut) {
        const key = getKey(grant);
        acc[key] = acc[key] ?? [];
        acc[key].push(grant);
      }

      return acc;
    },
    {},
  );

  return Object.values(map).map((grants) => {
    // Built fresh above and aliased nowhere, so it can be sorted in place.
    grants.sort(byRecency);

    // Every scalar below is read off the entry's most recent grant rather than
    // whichever grant the payload happened to list last, so a row rendering
    // both a scalar and a newest-first ledger describes the same grant.
    const [latest] = grants;

    return {
      // credit-specific attributes
      id: latest.billingCreditId,
      name: latest.creditName,
      singularName: latest.singularName,
      pluralName: latest.pluralName,
      description: latest.creditDescription,
      icon: latest.creditIcon,
      grantReason: latest.grantReason,
      quantity: latest.quantity,
      // shared attributes
      companyId: latest.companyId,
      companyName: latest.companyName,
      planId: latest.planId,
      planName: latest.planName,
      bundleId: latest.billingCreditBundleId,
      // custom attributes
      total: grants.reduce(
        (total, grant) => ({
          value: total.value + grant.quantity,
          remaining: total.remaining + grant.quantityRemaining,
          used: total.used + grant.quantityUsed,
        }),
        { value: 0, remaining: 0, used: 0 },
      ),
      grants,
    };
  });
}

/**
 * One entry per credit — the company's live balance for each credit, summed
 * across every grant that supplied it. Entries follow the order the credits
 * appear in the ledger, so a list of them stays put as grants come and go.
 */
export function aggregateActiveGrantsByCredit(
  creditGrants: CreditCompanyGrantView[],
) {
  return aggregateActiveGrants(creditGrants, (grant) => grant.billingCreditId);
}

/**
 * One entry per (grant reason, credit bundle) pair, falling back to one entry
 * per grant for grants that arrived outside a bundle (plan allocations,
 * promotional grants). Entries come back newest-first, so a truncated list
 * shows the most recent purchases.
 *
 * The reason is part of the key because the same bundle can be acquired more
 * than one way — bought outright and topped up automatically — and callers
 * split the entries into per-reason sections. Keyed on the bundle alone, such
 * a pair would merge into one entry whose section depended on payload order.
 *
 * Note that entries are keyed by bundle but still carry `id: billingCreditId`,
 * so two bundles of the same credit share an `id` — don't use it as a React key.
 */
export function aggregateActiveGrantsByBundle(
  creditGrants: CreditCompanyGrantView[],
) {
  return aggregateActiveGrants(
    creditGrants,
    (grant) =>
      `${grant.grantReason}:${grant.billingCreditBundleId || grant.id}`,
  ).sort((a, b) => byRecency(a.grants[0], b.grants[0]));
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

type BundleCompatibility = Partial<
  Pick<BillingCreditBundleView, "compatiblePlanIds">
>;

/**
 * Whether a bundle may be purchased by a company on the given base plan. A
 * bundle with enumerated `compatiblePlanIds` is purchasable only on the listed
 * plans; a bundle with none is purchasable on every plan. No plan (undefined)
 * matches no enumerated set, so only unrestricted bundles pass. Mirrors the
 * API's checkout enforcement (`BillingCreditBundleView.IsCompatibleWithPlan`),
 * so the embed never offers a bundle the purchase would reject with a 400.
 */
export function isBundleCompatibleWithPlan(
  bundle: BundleCompatibility,
  planId: string | undefined,
): boolean {
  const compatiblePlanIds = bundle.compatiblePlanIds ?? [];
  if (compatiblePlanIds.length === 0) {
    return true;
  }
  return !!planId && compatiblePlanIds.includes(planId);
}

/** Drops bundles that are not purchasable on the given base plan. */
export function filterCreditBundles<T extends BundleCompatibility>(
  bundles: T[] | undefined,
  planId: string | undefined,
): T[] {
  return (bundles ?? []).filter((bundle) =>
    isBundleCompatibleWithPlan(bundle, planId),
  );
}

/**
 * Filters bundles by plan compatibility and resolves each surviving bundle's
 * `count` from the supplied counts map (keyed by bundle id).
 */
export function deriveCreditBundles<
  T extends Pick<BillingCreditBundleView, "id"> & BundleCompatibility,
>(
  bundles: T[] | undefined,
  planId: string | undefined,
  counts: Record<string, number>,
): (T & { count: number })[] {
  return filterCreditBundles(bundles, planId).map((bundle) => ({
    ...bundle,
    count: counts[bundle.id] ?? 0,
  }));
}

/**
 * Credit ids with at least one bundle purchasable on the given plan — the
 * buy-more surfaces show for exactly these credits.
 */
export function getPurchasableCreditIds<
  T extends Pick<BillingCreditBundleView, "creditId"> & BundleCompatibility,
>(bundles: T[] | undefined, planId: string | undefined): Set<string> {
  return new Set(
    filterCreditBundles(bundles, planId).map((bundle) => bundle.creditId),
  );
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
