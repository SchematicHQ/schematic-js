import type { PreviewSubscriptionFinanceResponseData } from "../api/checkoutexternal";

/**
 * Determines if billing address collection is required for tax purposes
 * based on the preview subscription finance response data.
 *
 * @param financeData - The finance response data from preview checkout
 * @returns true if billing address collection is needed for tax calculation
 */
export function isBillingAddressRequiredForTax(
  financeData?: PreviewSubscriptionFinanceResponseData | null,
): boolean {
  if (!financeData) {
    return false;
  }

  return financeData.taxRequireBillingDetails;
}

/**
 * Determines if billing address collection should be enabled based on
 * existing checkout settings and tax requirements.
 *
 * @param collectAddressSetting - Current collect address setting from checkout settings
 * @param financeData - The finance response data from preview checkout
 * @returns true if billing address collection should be enabled
 */
export function shouldCollectBillingAddress(
  collectAddressSetting: boolean,
  financeData?: PreviewSubscriptionFinanceResponseData | null,
): boolean {
  if (collectAddressSetting) {
    return true;
  }

  return isBillingAddressRequiredForTax(financeData);
}
