import type { InvoicePage, InvoiceQuery } from "./invoices";
import type { PaymentMethod } from "./paymentMethods";
import type { UpcomingInvoice } from "./upcoming";

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
 * company or user id: users and companies are many-to-many, and a token names
 * the pair. What is loaded belongs to the session it was read under — the
 * pair, as `sessionKey` writes it — and a store that keeps more than one
 * session's data keys it by that and serves only the active one.
 */
export interface BillingResources {
  /** `GET /company/invoices?limit&offset&include_pending`. */
  invoices: InvoicePage;
  /**
   * `GET /company/upcoming-invoice`. `null` is a loaded value — the company
   * has no next bill, which the endpoint reports as a 204 — so only
   * `undefined` means the resource has not loaded.
   */
  upcomingInvoice: UpcomingInvoice | null;
  /**
   * `GET /company/payment-methods`. Empty is a loaded value — the company
   * has no method on file — so only `undefined` means not loaded.
   */
  paymentMethods: PaymentMethod[];
}

/** `Record<string, never>` marks a singleton; anything else is keyed. */
export interface BillingResourceParams {
  invoices: InvoiceQuery;
  upcomingInvoice: Record<string, never>;
  paymentMethods: Record<string, never>;
}

/** The params of every singleton resource. */
export const SINGLETON: Record<string, never> = {};

export type BillingResourceName = keyof BillingResources;

/**
 * A prefetch or fixture. An omitted key reports as pending; a keyed resource
 * seeds under `params`, or its defaults when absent, so a prefetch for a
 * non-default query is claimed rather than refetched by the element.
 */
export type BillingData = {
  [K in BillingResourceName]?: BillingResources[K];
} & {
  params?: Partial<BillingResourceParams>;
  /**
   * A prefetch outlives the render that made it — a cached page, a session
   * resolving to somebody else — so a store adopts it only for the session
   * it names. `fetchBillingData` fills it in; a fixture need not.
   */
  sessionKey?: string;
};
