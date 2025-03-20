import pluralize from "pluralize";
import { FeatureDetailResponseData } from "../api";

interface getFeatureName {
  (
    feature: Pick<
      FeatureDetailResponseData,
      "name" | "singularName" | "pluralName"
    >,
    count?: number,
  ): string;
}

export const getFeatureName: getFeatureName = (feature, count = 1) => {
  const shouldBePlural = count === 0 || count > 1;
  const { name, singularName, pluralName } = feature;

  if (pluralName && shouldBePlural) return pluralName;
  if (singularName)
    return shouldBePlural ? pluralize(singularName, count) : singularName;

  return pluralize(name, count);
};
