import { type FeatureDetailResponseData } from "../../api/checkoutexternal";
import { pluralize } from "../pluralize";

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
