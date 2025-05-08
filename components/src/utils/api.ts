import { debounce, type DebounceSettings } from "lodash";

import type { FeatureDetailResponseData } from "../api/checkoutexternal";
import { FETCH_DEBOUNCE_TIMEOUT } from "../const";
import { type SelectedPlan } from "../hooks";
import { pluralize } from "./pluralize";

export const debounceOptions: DebounceSettings = {
  leading: true,
  trailing: false,
};

interface DebouncedRequestParams<T, P> {
  fn?: (requestParameters: P, initOverrides?: RequestInit) => Promise<T>;
  params: P;
  token: string;
}

export function createDebouncedRequest<T, P>({
  fn,
  params,
  token,
}: DebouncedRequestParams<T, P>) {
  const requestOptions = { headers: { "X-Schematic-Api-Key": token } };
  return debounce(
    () => fn?.(params, requestOptions),
    FETCH_DEBOUNCE_TIMEOUT,
    debounceOptions,
  );
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
