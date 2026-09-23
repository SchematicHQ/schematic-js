import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useSyncExternalStore,
} from "react";

import { resolveLocale } from "../elements/model/format";

import {
  DEFAULT_LANGUAGE,
  LOOKUP_OPTIONS,
  createSchematicI18n,
  i18n as defaultI18n,
} from "./i18n";
import type {
  SchematicI18nInstance,
  SchematicTranslations,
  Translate,
  TranslationOptions,
} from "./types";

interface LocalizationContextValue {
  /** The host's own instance, consulted first. */
  host?: SchematicI18nInstance;
  /** Ours: the English bundle plus any `translations` the host supplied. */
  fallback: SchematicI18nInstance;
  locale?: string;
}

const LocalizationContext = createContext<LocalizationContextValue>({
  fallback: defaultI18n,
});

export interface LocalizationProviderProps {
  children: React.ReactNode;
  i18n?: SchematicI18nInstance;
  translations?: Record<string, SchematicTranslations>;
  locale?: string;
}

export const LocalizationProvider = ({
  children,
  i18n,
  translations,
  locale,
}: LocalizationProviderProps) => {
  // Keyed on content, not identity: `translations={{ it }}` written inline is
  // a new object every render, and must not build a new instance each time.
  const serialized = translations ? JSON.stringify(translations) : undefined;
  const fallback = useMemo(
    () =>
      serialized ? createSchematicI18n(JSON.parse(serialized)) : defaultI18n,
    [serialized],
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

  useHostChanges(host);

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
 * The host instance's events that can change what a key resolves to. Its
 * store's `added` covers a backend delivering our namespace after mount.
 *
 * Subscribed to directly rather than through react-i18next, whose hook loads
 * the namespace it is given: a host with a backend would fetch a `schematic`
 * bundle it may not have.
 */
const HOST_EVENTS = ["initialized", "languageChanged", "loaded"] as const;

function useHostChanges(host: SchematicI18nInstance | undefined): void {
  // Each change bumps the version, so `useSyncExternalStore` sees a new
  // snapshot. Nothing reads the number itself.
  const version = useRef(0);

  const subscribe = useCallback(
    (onChange: () => void) => {
      if (!host) {
        return () => {};
      }

      const handler = () => {
        version.current += 1;
        onChange();
      };
      for (const event of HOST_EVENTS) {
        host.on(event, handler);
      }
      host.store?.on("added", handler);

      return () => {
        for (const event of HOST_EVENTS) {
          host.off(event, handler);
        }
        host.store?.off("added", handler);
      };
    },
    [host],
  );

  useSyncExternalStore(
    subscribe,
    () => version.current,
    () => version.current,
  );
}

/**
 * Numbers interpolated into copy are formatted for the locale, so a quantity
 * reads `20,000` or `20.000` rather than `20000`. `count` stays a number:
 * i18next picks the plural form from it, and the bundle formats it with
 * `{{count, number}}`.
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
