import {
  PlanCreditGrantView,
  type CompatiblePlans,
  type UpdateAddOnRequestBody,
  type UpdateAutoTopupOverrideRequestBody,
  type UpdateCreditBundleRequestBody,
  type UpdatePayInAdvanceRequestBody,
} from "../../api/checkoutexternal";
import type {
  AutoTopupConfig,
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../types";
import { getAddOnPrice, getEntitlementPrice } from "./billing";
import { isAutoTopupOff } from "./credit";

export function buildAutoTopupRequestBody(options: {
  creditGrants: PlanCreditGrantView[];
  autoTopupConfigs?: Map<string, AutoTopupConfig>;
}) {
  const { creditGrants, autoTopupConfigs } = options;

  return creditGrants.reduce(
    (acc: UpdateAutoTopupOverrideRequestBody[], grant) => {
      if (!isAutoTopupOff(grant) && autoTopupConfigs?.has(grant.id)) {
        const config = autoTopupConfigs.get(grant.id);

        acc.push({
          planCreditGrantId: grant.id,
          autoTopupEnabled: config?.companyAutoTopupEnabled,
          autoTopupAmount: config?.companyAutoTopupAmount,
          autoTopupThresholdCredits: config?.companyAutoTopupThresholdCredits,
        });
      }

      return acc;
    },
    [],
  );
}

/**
 * Builds an add-on-id → compatible-plan-ids lookup so repeated compatibility
 * checks against the same `addOnCompatibilities` are O(1) instead of re-scanning
 * the list per add-on. First entry wins, matching the prior `.find` semantics.
 */
export function buildAddOnCompatibilityLookup(
  compatibilities: CompatiblePlans[] = [],
): Map<string, string[]> {
  const lookup = new Map<string, string[]>();
  for (const compat of compatibilities) {
    if (!lookup.has(compat.sourcePlanId)) {
      lookup.set(compat.sourcePlanId, compat.compatiblePlanIds ?? []);
    }
  }
  return lookup;
}

export function isAddOnCompatibleWithLookup(
  lookup: Map<string, string[]>,
  addOnId: string,
  planId: string | undefined,
): boolean {
  const compatiblePlanIds = lookup.get(addOnId);

  if (!compatiblePlanIds || compatiblePlanIds.length === 0) {
    return true;
  }

  return !!planId && compatiblePlanIds.includes(planId);
}

export function buildPayInAdvanceRequestBody(options: {
  entitlements: UsageBasedEntitlement[];
  period: string;
  currency?: string;
}): UpdatePayInAdvanceRequestBody[] {
  const { entitlements, period, currency } = options;
  return entitlements.reduce(
    (acc: UpdatePayInAdvanceRequestBody[], entitlement) => {
      const billingPrice = getEntitlementPrice(entitlement, period, currency);
      const priceId = billingPrice?.priceId;

      if (priceId) {
        acc.push({
          priceId,
          quantity: entitlement.quantity,
        });
      }

      return acc;
    },
    [],
  );
}

export function buildAddOnRequestBody(options: {
  addOns: SelectedPlan[];
  period: string;
  shouldTrial: boolean;
  currency?: string;
}): UpdateAddOnRequestBody[] {
  const { addOns, period, shouldTrial, currency } = options;
  return addOns.reduce((acc: UpdateAddOnRequestBody[], addOn) => {
    if (addOn.isSelected && !shouldTrial) {
      const addOnPrice = getAddOnPrice(addOn, period, currency);
      const addOnPriceId = addOnPrice?.id;

      if (addOnPriceId) {
        acc.push({
          addOnId: addOn.id,
          priceId: addOnPriceId,
        });
      }
    }

    return acc;
  }, []);
}

// Recognizes 409 responses from POST /checkout(/preview) where a pending
// scheduled checkout is blocking the action. The backend currently emits
// four variants of this conflict (already-exists, blocks add-ons, blocks
// pay-in-advance, blocks credits) — see api/apps/errors/errors.go. Match on
// the shared phrasing rather than exact strings so a wording tweak on the
// backend doesn't silently regress the friendly UI message.
export function isScheduledCheckoutConflictMessage(message: unknown): boolean {
  if (typeof message !== "string") {
    return false;
  }
  const m = message.toLowerCase();
  return m.includes("scheduled downgrade") || m.includes("scheduled checkout");
}

export function buildCreditBundlesRequestBody(
  creditBundles: CreditBundle[],
): UpdateCreditBundleRequestBody[] {
  return creditBundles.reduce(
    (acc: UpdateCreditBundleRequestBody[], { id, count }) => {
      if (count > 0) {
        acc.push({
          bundleId: id,
          quantity: count,
        });
      }

      return acc;
    },
    [],
  );
}
