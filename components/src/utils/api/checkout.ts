import {
  type UpdateAddOnRequestBody,
  type UpdateCreditBundleRequestBody,
  type UpdatePayInAdvanceRequestBody,
} from "../../api/checkoutexternal";
import type {
  CreditBundle,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../types";
import { getAddOnPrice, getEntitlementPrice } from "./billing";

export function buildPayInAdvanceRequestBody(
  entitlements: UsageBasedEntitlement[],
  period: string,
  currency?: string,
): UpdatePayInAdvanceRequestBody[] {
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

export function buildAddOnRequestBody(
  addOns: SelectedPlan[],
  period: string,
  shouldTrial: boolean,
  addOnPayInAdvanceEntitlements: UsageBasedEntitlement[],
  currency?: string,
): UpdateAddOnRequestBody[] {
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
