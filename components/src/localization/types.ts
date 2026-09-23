import type en from "./en";

/** Every key in the English bundle, plural forms included. */
type BundleKey = keyof typeof en;

/** The i18next plural suffixes, cardinal and ordinal. */
type PluralSuffix =
  `_${"ordinal_" | ""}${"zero" | "one" | "two" | "few" | "many" | "other"}`;

type StripPlural<K> = K extends `${infer Base}${PluralSuffix}` ? Base : K;

/**
 * A key the components translate. Plural keys appear once, without their
 * suffix, since the components look them up by the bare key and a `count`.
 */
export type SchematicTranslationKey = StripPlural<BundleKey>;

/**
 * A translation bundle for the components, keyed by the English bundle's
 * keys. Plural keys take i18next's suffixes (`_one`, `_other`, and so on), and
 * any key left out falls back to English.
 */
export type SchematicTranslations = Partial<
  Record<BundleKey | `${SchematicTranslationKey}${PluralSuffix}`, string>
>;

/** Interpolation values, and `count` for a plural key. */
export type TranslationOptions = Record<string, unknown>;

export type Translate = (
  key: SchematicTranslationKey,
  options?: TranslationOptions,
) => string;
