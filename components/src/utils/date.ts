import type { Translate } from "../localization";

/** `locale` is the BCP 47 tag from `useTranslation`. */
export interface DateFormatOptions extends Intl.DateTimeFormatOptions {
  locale: string;
}

export function toPrettyDate(
  date: Date | string,
  { locale, ...format }: DateFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...format,
  }).format(new Date(date));
}

export function getMonthName(
  date: Date | string,
  { locale, ...format }: DateFormatOptions,
) {
  return new Intl.DateTimeFormat(locale, {
    month: "long",
    ...format,
  }).format(new Date(date));
}

/** The abbreviations are bundle keys, so a translation owns them. */
export function shortenPeriod(period: string, t: Translate) {
  switch (period) {
    case "month":
      return t("mo");
    case "quarter":
      return t("qtr");
    case "year":
      return t("yr");
  }
}

export function modifyDate(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
