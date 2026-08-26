import { type StripeElementLocale } from "@stripe/stripe-js";

/**
 * The locales Stripe.js can render its Elements in. Anything outside this set
 * has to fall back, since Stripe rejects unknown tags.
 */
const SUPPORTED_LOCALES = [
  "ar",
  "bg",
  "cs",
  "da",
  "de",
  "el",
  "en",
  "en-AU",
  "en-CA",
  "en-NZ",
  "en-GB",
  "es",
  "es-ES",
  "es-419",
  "et",
  "fi",
  "fil",
  "fr",
  "fr-CA",
  "fr-FR",
  "he",
  "hu",
  "hr",
  "id",
  "it",
  "it-IT",
  "ja",
  "ko",
  "lt",
  "lv",
  "ms",
  "mt",
  "nb",
  "nl",
  "no",
  "pl",
  "pt",
  "pt-BR",
  "ro",
  "ru",
  "sk",
  "sl",
  "sv",
  "th",
  "tr",
  "vi",
  "zh",
  "zh-HK",
  "zh-TW",
] as const satisfies readonly StripeElementLocale[];

const DEFAULT_LOCALE: StripeElementLocale = "en";

/**
 * Resolves the language the embed is rendering in to a locale Stripe.js
 * accepts. Stripe defaults to `auto`, which follows the browser rather than
 * the embed, so passing this keeps the payment form in the same language as
 * the surrounding UI.
 */
export const stripeLocale = (language?: string): StripeElementLocale => {
  if (!language) {
    return DEFAULT_LOCALE;
  }

  const exact = SUPPORTED_LOCALES.find(
    (locale) => locale.toLowerCase() === language.toLowerCase(),
  );
  if (exact) {
    return exact;
  }

  // A regional tag Stripe does not carry (e.g. `en-US`) still resolves
  // through its base language.
  const base = language.split("-")[0].toLowerCase();
  return SUPPORTED_LOCALES.find((locale) => locale === base) ?? DEFAULT_LOCALE;
};
