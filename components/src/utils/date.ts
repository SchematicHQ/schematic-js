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

export function shortenPeriod(period: string) {
  switch (period) {
    case "month":
      return "mo";
    case "quarter":
      return "qtr";
    case "year":
      return "yr";
  }
}

export function modifyDate(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
