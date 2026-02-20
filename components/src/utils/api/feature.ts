import { type FeatureDetailResponseData } from "../../api/checkoutexternal";
import { pluralize } from "../pluralize";

/**
 * Gets the singular or plural name of a feature
 * @param feature
 * @param count - optional - count from which to pluralize
 * @param ignore - optional - ignore user-set values and use `pluralize` instead
 */

export function getFeatureName(
  feature: Pick<
    FeatureDetailResponseData,
    "name" | "singularName" | "pluralName"
  >,
  count = 0,
  ignore = false,
) {
  const shouldBePlural = count === 0 || count > 1;
  const { name, singularName, pluralName } = feature;

  if (!ignore && pluralName && shouldBePlural) {
    return pluralName;
  }

  if (!ignore && singularName) {
    return shouldBePlural ? pluralize(singularName, count) : singularName;
  }

  return pluralize(name, count);
}
