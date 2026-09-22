import { createInstance, type i18n as I18n } from "i18next";

import en from "./en";
import type { SchematicTranslations } from "./types";

/**
 * The namespace the components read from. A host passing its own i18next
 * instance puts its translations of the components here, so our keys never
 * collide with its own.
 */
export const SCHEMATIC_NAMESPACE = "schematic";

export const DEFAULT_LANGUAGE = "en";

/** The English bundle, for a host to translate from. */
export const schematicTranslationsEn: Readonly<SchematicTranslations> = en;

/**
 * Our keys are English sentences, so a `.` or `:` inside one must not be read
 * as a nested path or a namespace. Passed on every lookup, since a host's
 * instance may be configured otherwise.
 */
export const LOOKUP_OPTIONS = {
  ns: SCHEMATIC_NAMESPACE,
  keySeparator: false,
  nsSeparator: false,
} as const;

/**
 * A private instance holding the English bundle and any `translations` the
 * host supplied, keyed by language. It never touches the global i18next
 * instance, which may belong to the host.
 */
export function createSchematicI18n(
  translations?: Record<string, SchematicTranslations>,
): I18n {
  const resources: Record<
    string,
    Record<string, Readonly<SchematicTranslations>>
  > = {
    [DEFAULT_LANGUAGE]: { [SCHEMATIC_NAMESPACE]: schematicTranslationsEn },
  };

  for (const [language, bundle] of Object.entries(translations ?? {})) {
    resources[language] = {
      [SCHEMATIC_NAMESPACE]: {
        ...resources[language]?.[SCHEMATIC_NAMESPACE],
        ...bundle,
      },
    };
  }

  const instance = createInstance();
  void instance.init({
    resources,
    lng: DEFAULT_LANGUAGE,
    fallbackLng: DEFAULT_LANGUAGE,
    ns: [SCHEMATIC_NAMESPACE],
    defaultNS: SCHEMATIC_NAMESPACE,
    keySeparator: false,
    nsSeparator: false,
    initAsync: false,
    interpolation: {
      escapeValue: false,
    },
  });

  return instance;
}

/** The English-only instance, used when the host supplies no translations. */
export const i18n = createSchematicI18n();
