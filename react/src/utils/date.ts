export function toMonthDay(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
  }).format(new Date(date));
}

export function toPrettyDate(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  }).format(new Date(date));
}

export function getMonthName(date: Date | string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "long",
  }).format(new Date(date));
}
