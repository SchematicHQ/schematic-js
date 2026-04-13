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
