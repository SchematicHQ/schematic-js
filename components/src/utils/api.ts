import { debounce, type DebounceSettings } from "lodash";

import { type PublicPlansResponseData } from "../api/componentspublic";
import {
  type ComponentHydrateResponseData,
  type FeatureDetailResponseData,
} from "../api/checkoutexternal";
import { FETCH_DEBOUNCE_TIMEOUT } from "../const";
import { type SelectedPlan } from "../hooks";
import { pluralize } from "./pluralize";

export const debounceOptions: DebounceSettings = {
  leading: true,
  trailing: false,
};

interface DebouncedRequestParams<T, P> {
  fn:
    | ((requestParameters: P, initOverrides?: RequestInit) => Promise<T>)
    | ((initOverrides?: RequestInit) => Promise<T>)
    | undefined;
  params?: P;
  initOverrides?: RequestInit;
}

export function createDebouncedRequest<T, P>({
  fn,
  params,
  initOverrides,
}: DebouncedRequestParams<T, P>) {
  return debounce(
    // @ts-expect-error: params could potentially be request options type
    () => (params ? fn?.(params, initOverrides) : fn?.(initOverrides)),
    FETCH_DEBOUNCE_TIMEOUT,
    debounceOptions,
  );
}

export function isCheckoutData(
  data?: PublicPlansResponseData | ComponentHydrateResponseData,
): data is ComponentHydrateResponseData {
  return typeof data !== "undefined" && "company" in data;
}

export function getFeatureName(
  feature: Pick<
    FeatureDetailResponseData,
    "name" | "singularName" | "pluralName"
  >,
  count = 0,
) {
  const shouldBePlural = count === 0 || count > 1;
  const { name, singularName, pluralName } = feature;

  if (pluralName && shouldBePlural) {
    return pluralName;
  }

  if (singularName) {
    return shouldBePlural ? pluralize(singularName, count) : singularName;
  }

  return pluralize(name, count);
}

export function getBillingPrice<
  T extends { price: number; priceDecimal?: string | null },
>(billingPrice?: T): T | undefined {
  if (!billingPrice) {
    return;
  }

  const price =
    typeof billingPrice.priceDecimal === "string"
      ? Number(billingPrice.priceDecimal)
      : billingPrice.price;

  return { ...billingPrice, price };
}

export function getAddOnPrice(addOn: SelectedPlan, period: string) {
  if (addOn.chargeType === ChargeType.oneTime) {
    return addOn.oneTimePrice;
  }

  if (period === "year") {
    return addOn.yearlyPrice;
  }

  return addOn.monthlyPrice;
}

export const ChargeType = {
  oneTime: "one_time",
  recurring: "recurring",
  free: "free",
};
