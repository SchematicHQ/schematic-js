import { featureName, isEnglish } from "../../elements/model/format";
import { pluralize } from "../pluralize";

type Named = {
  name: string;
  singularName?: string | null;
  pluralName?: string | null;
};

/**
 * Gets the singular or plural name of a feature
 * @param feature
 * @param locale - English locales inflect names with English suffix rules;
 * other languages keep the configured names as given
 * @param count - optional - count from which to pluralize; plural when omitted
 * @param ignore - optional - ignore user-set values and use `pluralize` instead
 */
export function getFeatureName(
  feature: Named,
  locale: string,
  count?: number,
  ignore = false,
) {
  if (!isEnglish(locale)) {
    const named: Named = ignore ? { name: feature.name } : feature;

    // 0 is singular in some languages, so no count cannot stand in for 0.
    if (count === undefined) {
      return named.pluralName || named.singularName || named.name;
    }

    return featureName(named, count, locale);
  }

  const resolvedCount = count ?? 0;
  const shouldBePlural = resolvedCount === 0 || resolvedCount > 1;
  const { name, singularName, pluralName } = feature;

  if (!ignore && pluralName && shouldBePlural) {
    return pluralName;
  }

  if (!ignore && singularName) {
    return shouldBePlural
      ? pluralize(singularName, resolvedCount)
      : singularName;
  }

  return pluralize(name, resolvedCount);
}
