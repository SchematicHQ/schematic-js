import type { InvoicePage, InvoiceQuery } from "./invoices";

export interface ResourceState<T> {
  /** `undefined` until the first successful load; retained across later errors. */
  data: T | undefined;
  /** The latest failure; cleared by the next success. */
  error: Error | undefined;
  /** A request is in flight and no data has arrived yet, or a refetch is running. */
  isPending: boolean;
}

/**
 * Nothing in the store, the hooks, or the resource keys may be addressed by
 * company or user id: users and companies are many-to-many, and a future
 * token may name a (company, user) pair. A token change on any axis is a
 * full reset, and data spanning companies is one token each, not one store.
 */
export interface CompanyResources {
  /** `GET /company/invoices?limit&offset&include_pending`. */
  invoices: InvoicePage;
}

/** `Record<string, never>` marks a singleton; anything else is keyed. */
export interface CompanyResourceParams {
  invoices: InvoiceQuery;
}

export type CompanyResourceName = keyof CompanyResources;

/**
 * A prefetch or fixture. An omitted key reports as pending; a keyed resource
 * seeds under `params`, or its defaults when absent, so a prefetch for a
 * non-default query is claimed rather than refetched by the element.
 */
export type CompanyData = {
  [K in CompanyResourceName]?: CompanyResources[K];
} & {
  params?: Partial<CompanyResourceParams>;
  /**
   * A prefetch outlives the render that made it — a cached page, a session
   * resolving to somebody else — so a store adopts it only for the session
   * it names. `fetchCompanyData` fills it in; a fixture need not.
   */
  sessionKey?: string;
};
