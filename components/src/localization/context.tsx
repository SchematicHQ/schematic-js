import type { i18n as I18n } from "i18next";
import { createContext, useCallback, useContext, useMemo } from "react";
import { useTranslation as useI18nextTranslation } from "react-i18next";

import { resolveLocale } from "../elements/model/format";

import {
  DEFAULT_LANGUAGE,
  LOOKUP_OPTIONS,
  SCHEMATIC_NAMESPACE,
  createSchematicI18n,
  i18n as defaultI18n,
} from "./i18n";
import type {
  SchematicTranslations,
  Translate,
  TranslationOptions,
} from "./types";

interface LocalizationContextValue {
  /** The host's own instance, consulted first. */
  host?: I18n;
  /** Ours: the English bundle plus any `translations` the host supplied. */
  fallback: I18n;
  locale?: string;
}

const LocalizationContext = createContext<LocalizationContextValue>({
  fallback: defaultI18n,
});

export interface LocalizationProviderProps {
  children: React.ReactNode;
  i18n?: I18n;
  translations?: Record<string, SchematicTranslations>;
  locale?: string;
}

export const LocalizationProvider = ({
  children,
  i18n,
  translations,
  locale,
}: LocalizationProviderProps) => {
  const fallback = useMemo(
    () => (translations ? createSchematicI18n(translations) : defaultI18n),
    [translations],
  );

  const value = useMemo(
    () => ({ host: i18n, fallback, locale }),
    [i18n, fallback, locale],
  );

  return (
    <LocalizationContext.Provider value={value}>
      {children}
    </LocalizationContext.Provider>
  );
};

export interface UseTranslationResult {
  t: Translate;
  /** BCP 47 tag for number, currency, and date formatting. */
  locale: string;
}

/**
 * Looks a key up in the host's instance, then in ours, which ends in English.
 *
 * The language is the provider's `locale`, else the host instance's current
 * language, else English. Switching the host instance's language re-renders.
 */
export function useTranslation(): UseTranslationResult {
  const { host, fallback, locale } = useContext(LocalizationContext);

  // Subscribes to the active instance's language changes. Suspense is off:
  // a host instance loading the namespace from a backend must not suspend us.
  useI18nextTranslation(SCHEMATIC_NAMESPACE, {
    i18n: host ?? fallback,
    useSuspense: false,
  });

  const language = locale ?? host?.resolvedLanguage ?? host?.language;
  const resolvedLocale = resolveLocale(language);

  const t = useCallback<Translate>(
    (key, options) => {
      const lookup = {
        ...formatNumbers(options, resolvedLocale),
        ...LOOKUP_OPTIONS,
        lng: language,
      };
      if (host?.exists(key, lookup)) {
        return host.t(key, lookup);
      }

      return fallback.t(key, {
        ...lookup,
        lng: language ?? DEFAULT_LANGUAGE,
      });
    },
    [host, fallback, language, resolvedLocale],
  );

  return { t, locale: resolvedLocale };
}

/**
 * Numbers interpolated into copy are formatted for the locale, so a quantity
 * reads `20,000` or `20.000` rather than `20000`. `count` stays a number:
 * i18next picks the plural form from it.
 */
function formatNumbers(
  options: TranslationOptions | undefined,
  locale: string,
): TranslationOptions | undefined {
  if (!options) {
    return options;
  }

  let formatter: Intl.NumberFormat | undefined;
  const formatted: TranslationOptions = {};
  for (const [name, value] of Object.entries(options)) {
    if (typeof value === "number" && name !== "count") {
      formatter ??= new Intl.NumberFormat(locale);
      formatted[name] = formatter.format(value);
    } else {
      formatted[name] = value;
    }
  }

  return formatted;
}
