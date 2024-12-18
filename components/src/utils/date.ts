export function toMonthDay(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function toPrettyDate(
  date: Date | string,
  format?: { month: "long" | "short" },
) {
  return new Intl.DateTimeFormat("en-US", {
    month: format?.month ? format.month : "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function getMonthName(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
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
