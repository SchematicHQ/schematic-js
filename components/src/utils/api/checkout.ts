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
import { getAddOnPrice } from "./billing";

export function buildPayInAdvanceRequestBody(
  entitlements: UsageBasedEntitlement[],
  period: string,
): UpdatePayInAdvanceRequestBody[] {
  return entitlements.reduce(
    (
      acc: UpdatePayInAdvanceRequestBody[],
      { meteredMonthlyPrice, meteredYearlyPrice, quantity },
    ) => {
      const priceId = (
        period === "year" ? meteredYearlyPrice : meteredMonthlyPrice
      )?.priceId;

      if (priceId) {
        acc.push({
          priceId,
          quantity,
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
): UpdateAddOnRequestBody[] {
  return addOns.reduce((acc: UpdateAddOnRequestBody[], addOn) => {
    if (addOn.isSelected && !shouldTrial) {
      const addOnPrice = getAddOnPrice(addOn, period);
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
