export function toMonthDay(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function toPrettyDate(
  date: Date | string,
  format?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    ...format,
  }).format(new Date(date));
}

export function getMonthName(
  date: Date | string,
  format?: Intl.DateTimeFormatOptions,
) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    ...format,
  }).format(new Date(date));
}

export function shortenPeriod(period: string) {
  switch (period) {
    case "month":
      return "mo";
    case "year":
      return "yr";
  }
}

export function modifyDate(date: Date, days: number) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}
