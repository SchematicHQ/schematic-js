import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import type {
  CompanyResourceName,
  CompanyResourceParams,
  CompanyResources,
  InvoicePage,
  InvoiceQuery,
} from "./contract";
import { DEFAULT_INVOICE_QUERY, normalizeInvoiceQuery } from "./contract";
import { useCompanyDataSource, type ResourceHandle } from "./context";
import { hashKey } from "./store";

/**
 * One hook per company resource, each returning
 * `{ data, error, isPending, refetch }`. Hooks never fetch during server
 * rendering: without `initialData` they report pending on the server and
 * load on the client. This release carries `useInvoices`; the other resource
 * hooks ship with their elements.
 */

/** Returns a reference-stable copy of `params`: the same object until its hash changes. */
function useStableParams<P>(params: P): P {
  const key = hashKey(params);
  const ref = useRef({ key, params });
  if (ref.current.key !== key) {
    ref.current = { key, params };
  }
  return ref.current.params;
}

function useCompanyResource<K extends CompanyResourceName>(
  name: K,
  params: CompanyResourceParams[K],
): ResourceHandle<CompanyResources[K]> {
  const source = useCompanyDataSource();
  const subscribe = useCallback(
    (listener: () => void) => source.subscribe(name, params, listener),
    [name, params, source],
  );
  const getSnapshot = useCallback(
    () => source.handle(name, params),
    [name, params, source],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export interface InvoicesHandle extends ResourceHandle<InvoicePage> {
  /**
   * Requests the next page; appended to `data.invoices` when it arrives.
   * `isPending` is true while it is on the wire and `error` records a
   * failure, so a button can disable and report without awaiting. The
   * promise settles with the page and never rejects.
   */
  loadMore: () => Promise<void>;
}

/**
 * The invoice list for `query`. Each distinct query is its own list with its
 * own paging; an inline object literal is fine, the hook keys by value.
 */
export function useInvoices(
  query: InvoiceQuery = DEFAULT_INVOICE_QUERY,
): InvoicesHandle {
  const source = useCompanyDataSource();
  // Normalized first: a query that spells out a default has to reach the same
  // resource as one that leaves it out, or it misses the prefetch seed and
  // fetches rows that are already on screen.
  const params = useStableParams(normalizeInvoiceQuery(query));
  const handle = useCompanyResource("invoices", params);
  const loadMore = useCallback(
    () => source.loadMoreInvoices(params),
    [params, source],
  );
  return useMemo(() => ({ ...handle, loadMore }), [handle, loadMore]);
}

/** Reloads every loaded company resource (after a plan change, for instance). */
export function useInvalidateCompanyData(): () => void {
  return useCompanyDataSource().invalidateAll;
}
