import React, { createContext, useContext, useMemo } from "react";

/**
 * Locale and copy live in their own context, not on the billing data source:
 * a host's `t` changes identity whenever its language does, and a source
 * rebuilt for that takes its cached snapshots with it, leaving
 * `useSyncExternalStore` a new handle every render.
 *
 * Nothing here interprets a key — the element package owns the key list and
 * the English copy.
 */

/**
 * Shaped like i18next's `t` so `translate={t}` is the whole integration.
 * `vars` reaches it as the options object, which is what lets `{ count }`
 * resolve a language's plural forms in the host's own stack rather than in
 * ours.
 *
 * Returning `undefined` means "no translation" and the caller falls back to
 * its English default. Elements also pass a sentinel `defaultValue`, so a stack
 * that answers every key with something still reports a real miss.
 */
export type Translate = (
  key: string,
  vars?: Record<string, unknown>,
) => string | undefined;

/** Copy overrides by key. Keys are the element package's `StringKey`s. */
export type StringOverrides = Record<string, string | undefined>;

export interface SchematicI18nConfig {
  /** BCP 47 tag the elements format in; defaults to the runtime's locale. */
  locale?: string;
  /** Routes element copy to the host's i18n stack — pass i18next's `t`. */
  translate?: Translate;
  /**
   * Copy by key, for a host renaming strings rather than translating them.
   * Wins over `translate`; an element's own `strings` prop wins over both.
   */
  strings?: StringOverrides;
  /** Reports a mis-wired catalogue that would otherwise look correct. */
  onMissingString?: (key: string) => void;
}

const EMPTY: SchematicI18nConfig = Object.freeze({});

export const SchematicI18nContext = createContext<SchematicI18nConfig>(EMPTY);

export interface SchematicI18nProviderProps extends SchematicI18nConfig {
  children?: React.ReactNode;
}

/**
 * `SchematicProvider` renders one of these, so most hosts never name it.
 * Nesting merges rather than replaces: a provider setting only `locale`
 * keeps the translator above it, and `strings` layers key by key.
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

/** Empty, never undefined, outside a provider. */
export function useSchematicI18n(): SchematicI18nConfig {
  return useContext(SchematicI18nContext);
}

/** Unresolved: elements call `useResolvedLocale`, which applies the fallback. */
export function useSchematicLocale(): string | undefined {
  return useContext(SchematicI18nContext).locale;
}

export function useSchematicTranslate(): Translate | undefined {
  return useContext(SchematicI18nContext).translate;
}

export function useSchematicStrings(): StringOverrides | undefined {
  return useContext(SchematicI18nContext).strings;
}
