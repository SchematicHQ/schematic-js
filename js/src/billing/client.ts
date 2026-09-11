/**
 * The billing surface a company's own users read about themselves: what they
 * are subscribed to, what they have used, what they have been invoiced, and
 * — as the endpoints land — what changing any of it would cost. Everything
 * here is read with a temporary access token; the session that holds it, and
 * the request that carries it, are `SchematicSession`.
 */

import { GetCompanyInvoicesResponseFromJSON } from "./api/generated/models";
import type {
  BillingData,
  BillingResourceName,
  InvoicePage,
  InvoiceQuery,
} from "./contract";
import { normalizeInvoiceQuery } from "./contract";
import type {
  SessionEvent,
  SessionInput,
  SessionOptions,
  SessionStatus,
} from "./session";
import { SchematicSession } from "./session";

export interface InvoicesRequest extends InvoiceQuery {
  limit: number;
  offset: number;
}

/**
 * The rows asked for, and how many the query matches in total. `hasMore` is
 * the page's, and only the caller knows its offset.
 */
export type InvoicesResult = Omit<InvoicePage, "hasMore">;

/**
 * What a reader of billing data can ask for. Subscription and usage, and the
 * checkout calls that change them, join this interface as their endpoints
 * ship.
 */
export interface BillingClient {
  fetchInvoices(params: InvoicesRequest): Promise<InvoicesResult>;

  readonly sessionStatus: SessionStatus;

  readonly sessionKey: string | undefined;

  setSession(session: SessionInput): void;
  onSessionChange(listener: (event: SessionEvent) => void): () => void;
}

export type BillingClientOptions = SessionOptions;

export const INVOICE_PAGE_SIZE = 12;

/** A `limit` above this is a 400 (PaginationFilter in schematic-api). */
export const INVOICE_MAX_PAGE_SIZE = 250;

export class SchematicBillingClient implements BillingClient {
  /**
   * Public so a second client over the same surface can be constructed on
   * this one rather than minting tokens of its own.
   */
  readonly session: SchematicSession;

  constructor(options: BillingClientOptions | SchematicSession = {}) {
    this.session =
      options instanceof SchematicSession
        ? options
        : new SchematicSession(options);
  }

  get sessionKey(): string | undefined {
    return this.session.key;
  }

  get sessionStatus(): SessionStatus {
    return this.session.status;
  }

  setSession(session: SessionInput): void {
    this.session.set(session);
  }

  onSessionChange(listener: (event: SessionEvent) => void): () => void {
    return this.session.onChange(listener);
  }

  fetchInvoices(params: InvoicesRequest): Promise<InvoicesResult> {
    const query = new URLSearchParams({
      limit: String(Math.min(params.limit, INVOICE_MAX_PAGE_SIZE)),
      offset: String(params.offset),
    });
    if (params.includePending !== undefined) {
      query.set("include_pending", String(params.includePending));
    }
    const path = `/company/invoices?${query}`;
    return this.session.request(path).then((body) => {
      if (body === null || typeof body !== "object" || !("data" in body)) {
        throw new Error(`Malformed response from ${path}`);
      }
      // The generated decoder throws on a null where an empty history is
      // the right answer. `== null` catches the omitted field too.
      const data = (body as { data: unknown }).data as {
        invoices?: unknown;
      } | null;
      if (data == null || data.invoices == null) {
        return { invoices: [], count: 0 };
      }
      const decoded = GetCompanyInvoicesResponseFromJSON(body).data;
      return { invoices: decoded.invoices, count: decoded.count };
    });
  }
}

export interface BillingPrefetchOptions {
  names?: BillingResourceName[];
  /** The invoice query to prefetch for; the consumer must ask the same one. */
  invoices?: InvoiceQuery;
}

/**
 * Server prefetch for a provider's `initialData`. A resource that fails is
 * left out rather than thrown, so one of them cannot block a page.
 */
export async function fetchBillingData(
  client: BillingClient,
  options: BillingPrefetchOptions = {},
): Promise<BillingData> {
  const wanted = options.names ?? ["invoices"];
  const data: BillingData = {};
  // Normalized as the store normalizes what a caller asks, so that a
  // prefetch for a non-default query is claimed rather than fetched again.
  const invoices =
    options.invoices === undefined
      ? undefined
      : normalizeInvoiceQuery(options.invoices);
  if (invoices !== undefined) {
    data.params = { invoices };
  }
  // A page rendered before its auth resolves hands these rows to whichever
  // session turns up; it has to be the one they were fetched for.
  data.sessionKey = client.sessionKey;
  await Promise.all(
    wanted.map(async (name) => {
      try {
        switch (name) {
          case "invoices": {
            const page = await client.fetchInvoices({
              ...(invoices ?? {}),
              limit: INVOICE_PAGE_SIZE,
              offset: 0,
            });
            data.invoices = {
              invoices: page.invoices,
              count: page.count,
              // Two queries on the server: a count that outran the rows
              // would seed a page that pages nothing.
              hasMore:
                page.invoices.length > 0 && page.invoices.length < page.count,
            };
            break;
          }
        }
      } catch {
        // left out
      }
    }),
  );
  return data;
}
