import { useCallback, useMemo, useRef, useSyncExternalStore } from "react";

import type {
  BillingResourceName,
  BillingResourceParams,
  BillingResources,
  InvoicePage,
  InvoiceQuery,
} from "./contract";
import { DEFAULT_INVOICE_QUERY, normalizeInvoiceQuery } from "./contract";
import { useBillingDataSource, type ResourceHandle } from "./context";
import { hashKey } from "./store";

/**
 * Hooks never fetch during server rendering: without `initialData` they
 * report pending on the server and load on the client. This release carries
 * `useInvoices`; the other resource hooks ship with their elements.
 */

/** The same object until the hash of `params` changes. */
function useStableParams<P>(params: P): P {
  const key = hashKey(params);
  const ref = useRef({ key, params });
  if (ref.current.key !== key) {
    ref.current = { key, params };
  }
  return ref.current.params;
}

function useBillingResource<K extends BillingResourceName>(
  name: K,
  params: BillingResourceParams[K],
): ResourceHandle<BillingResources[K]> {
  const source = useBillingDataSource();
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
   * failure, so a caller can track both without awaiting — the promise
   * never rejects.
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
  const source = useBillingDataSource();
  // A query spelling out a default has to reach the same resource as one
  // that leaves it out, or it misses the seed and refetches what is loaded.
  const params = useStableParams(normalizeInvoiceQuery(query));
  const handle = useBillingResource("invoices", params);
  const loadMore = useCallback(
    () => source.loadMoreInvoices(params),
    [params, source],
  );
  return useMemo(() => ({ ...handle, loadMore }), [handle, loadMore]);
}

/** Reloads every loaded billing resource (after a plan change, for instance). */
export function useInvalidateBillingData(): () => void {
  return useBillingDataSource().invalidateAll;
}
