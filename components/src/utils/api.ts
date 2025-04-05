import type { FeatureDetailResponseData } from "../api";
import pluralize from "./pluralize";

export const getFeatureName = (
  feature: Pick<
    FeatureDetailResponseData,
    "name" | "singularName" | "pluralName"
  >,
  count = 0,
) => {
  const shouldBePlural = count === 0 || count > 1;
  const { name, singularName, pluralName } = feature;

  if (pluralName && shouldBePlural) {
    return pluralName;
  }

  if (singularName) {
    return shouldBePlural ? pluralize(singularName, count) : singularName;
  }

  return pluralize(name, count);
};

export function getBillingPrice<
  T extends { price: number; priceDecimal?: string | null },
>(billingPrice?: T): T | undefined {
  if (!billingPrice) {
    return;
  }

  const price =
    typeof billingPrice.priceDecimal === "string"
      ? parseFloat(billingPrice.priceDecimal)
      : billingPrice.price;

  return { ...billingPrice, price };
}
