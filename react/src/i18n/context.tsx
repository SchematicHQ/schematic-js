import React, { createContext, useContext, useMemo } from "react";

/**
 * The i18n seam: locale and copy, in their own context rather than on the
 * company data source.
 *
 * A host's `t` changes identity every time its language does, and an inline
 * `translate={(key, vars) => t(key, vars)}` changes it on every render, so it
 * has to stay clear of the resource handles. A source rebuilt for a copy
 * change takes its cached snapshots with it, and `useSyncExternalStore` then
 * reads a new handle on every render. Kept apart, copy and data change
 * independently: a language switch re-renders the elements and nothing else.
 *
 * Nothing here interprets a key. The element package owns the key list and
 * the English copy (`STRING_KEYS` and `DEFAULT_STRINGS` in
 * `@schematichq/schematic-components/v3`); this module only carries a host's
 * configuration down to it.
 */

/**
 * A host's translator, shaped like i18next's `t` so `translate={t}` is the
 * whole integration. `vars` reaches it as the options object, which is what
 * lets `{ count }` resolve a language's plural forms in the host's own
 * stack rather than in ours.
 *
 * Returning `undefined` means "no translation" and the element renders its
 * English default. Elements also pass a sentinel `defaultValue`, so a stack
 * that answers every key with something still reports a real miss.
 */
export type Translate = (
  key: string,
  vars?: Record<string, unknown>,
) => string | undefined;

/** Copy overrides by key. Keys are the element package's `StringKey`s. */
export type StringOverrides = Record<string, string | undefined>;

export interface SchematicI18nConfig {
  /** BCP 47 tag the elements format in; defaults to the viewer's language. */
  locale?: string;
  /** Routes element copy to the host's i18n stack — pass i18next's `t`. */
  translate?: Translate;
  /**
   * Copy by key, for a host renaming strings rather than translating them.
   * Wins over `translate`; an element's own `strings` prop wins over both.
   */
  strings?: StringOverrides;
  /**
   * Called with every key that fell back to English, so a mis-wired
   * catalogue reports itself instead of quietly looking correct.
   */
  onMissingString?: (key: string) => void;
}

const EMPTY: SchematicI18nConfig = Object.freeze({});

export const SchematicI18nContext = createContext<SchematicI18nConfig>(EMPTY);

export interface SchematicI18nProviderProps extends SchematicI18nConfig {
  children?: React.ReactNode;
}

/**
 * Configures locale and copy for the elements below it. `SchematicProvider`
 * renders one from its own `locale` / `translate` / `strings` props, so most
 * hosts never name it; render it directly to scope a different locale to a
 * subtree, or to use the elements' i18n with no data provider at all.
 *
 * Nesting merges rather than replaces: a provider that sets only `locale`
 * keeps the translator configured above it, and `strings` layers over the
 * outer ones key by key.
 */
export function SchematicI18nProvider({
  children,
  locale,
  onMissingString,
  strings,
  translate,
}: SchematicI18nProviderProps) {
  const parent = useContext(SchematicI18nContext);
  const value = useMemo<SchematicI18nConfig>(
    () => ({
      locale: locale ?? parent.locale,
      translate: translate ?? parent.translate,
      strings:
        strings === undefined
          ? parent.strings
          : { ...parent.strings, ...strings },
      onMissingString: onMissingString ?? parent.onMissingString,
    }),
    [locale, onMissingString, parent, strings, translate],
  );

  return (
    <SchematicI18nContext.Provider value={value}>
      {children}
    </SchematicI18nContext.Provider>
  );
}

/** The whole i18n configuration. Empty, never undefined, outside a provider. */
export function useSchematicI18n(): SchematicI18nConfig {
  return useContext(SchematicI18nContext);
}

/**
 * The configured locale, or `undefined` for "the viewer's". Elements call
 * `useResolvedLocale` in schematic-components/v3 instead, which resolves the
 * fallback chain down to a tag `Intl` can take.
 */
export function useSchematicLocale(): string | undefined {
  return useContext(SchematicI18nContext).locale;
}

/** The host's translator, if one was configured. */
export function useSchematicTranslate(): Translate | undefined {
  return useContext(SchematicI18nContext).translate;
}

/** The merged copy overrides, if any were configured. */
export function useSchematicStrings(): StringOverrides | undefined {
  return useContext(SchematicI18nContext).strings;
}
