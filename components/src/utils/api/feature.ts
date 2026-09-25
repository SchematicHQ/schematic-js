import { pluralize } from "../pluralize";

/** An unusable locale falls back to English, as the formatters do. */
function isEnglish(locale: string) {
  try {
    return new Intl.Locale(locale).language === "en";
  } catch {
    return true;
  }
}

/** The category comes from the locale: 0 is "one" in French, for example. */
function isOne(count: number, locale: string) {
  return new Intl.PluralRules(locale).select(count) === "one";
}

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
    const singularName = named.singularName || named.name;
    const pluralName = named.pluralName || singularName;

    // No count means the plural label. 0 cannot stand in for it, since 0 is
    // singular in some languages.
    return count !== undefined && isOne(count, locale)
      ? singularName
      : pluralName;
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
