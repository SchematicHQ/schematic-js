import type {
  AnyCatalog,
  CompanyContext,
  CreditBalanceEntry,
  FeatureUsageRow,
  Invoice,
  UpcomingInvoice,
} from "./contract";

/**
 * Wire → contract decoding. The proposed wire format is the contract in
 * snake_case with RFC3339 timestamps (see the contract diff), so decoding is
 * one mechanical pass: camelCase every key and parse the timestamp fields.
 * When the API publishes its spec, generated models replace this module and
 * nothing above the client changes.
 */

/** Keys whose values are RFC3339 timestamps on the wire. */
const DATE_KEYS = new Set([
  "billing_cycle_anchor",
  "cancel_at",
  "created_at",
  "current_period_end",
  "current_period_start",
  "due_date",
  "effective_at",
  "expires_at",
  "paid_at",
  "published_at",
  "resets_at",
  "trial_end",
  "valid_from",
]);

export function camelCase(key: string): string {
  return key.replace(/_([a-z0-9])/g, (_, c: string) => c.toUpperCase());
}

/** Recursively camelCases keys and parses timestamp fields. */
export function decode(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(decode);
  }
  if (value !== null && typeof value === "object") {
    const out: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      out[camelCase(key)] =
        DATE_KEYS.has(key) && typeof raw === "string"
          ? new Date(raw)
          : decode(raw);
    }
    return out;
  }
  return value;
}

/** Unwraps the API's `{ data: … }` envelope when present. */
export function unwrap(body: unknown): unknown {
  if (body !== null && typeof body === "object" && "data" in body) {
    return (body as { data: unknown }).data;
  }
  return body;
}

export const decodeCatalog = (body: unknown): AnyCatalog =>
  decode(unwrap(body)) as AnyCatalog;

export const decodeCompany = (body: unknown): CompanyContext =>
  decode(unwrap(body)) as CompanyContext;

export function decodeFeatureUsage(body: unknown): FeatureUsageRow[] {
  const data = decode(unwrap(body)) as
    { rows?: FeatureUsageRow[] } | FeatureUsageRow[];
  return Array.isArray(data) ? data : (data.rows ?? []);
}

export function decodeCreditBalances(body: unknown): CreditBalanceEntry[] {
  const data = decode(unwrap(body)) as
    { balances?: CreditBalanceEntry[] } | CreditBalanceEntry[];
  return Array.isArray(data) ? data : (data.balances ?? []);
}

export function decodeInvoices(body: unknown): Invoice[] {
  const data = decode(unwrap(body)) as { invoices?: Invoice[] } | Invoice[];
  return Array.isArray(data) ? data : (data.invoices ?? []);
}

export function decodeUpcomingInvoice(body: unknown): UpcomingInvoice | null {
  const data = unwrap(body);
  return data === null || data === undefined
    ? null
    : (decode(data) as UpcomingInvoice);
}
