import {
  useCallback,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type {
  BillingResourceName,
  BillingResourceParams,
  BillingResources,
  InvoicePage,
  InvoiceQuery,
  PaymentMethod,
  SetupIntent,
  UpcomingInvoice,
} from "./contract";
import {
  DEFAULT_INVOICE_QUERY,
  SINGLETON,
  normalizeInvoiceQuery,
} from "./contract";
import {
  actionsOf,
  useBillingDataSource,
  type ResourceHandle,
} from "./context";
import { hashKey } from "./store";

/**
 * Hooks never fetch during server rendering: without `initialData` they
 * report pending on the server and load on the client. `useInvoices`,
 * `useUpcomingInvoice` and `usePaymentMethods` so far; the other resource
 * hooks ship with their elements.
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

/**
 * The company's next bill. `data` is `null` when there is nothing to bill —
 * no subscription, which the endpoint reports as a 204 — so an element can
 * render an empty state; `data === undefined` is what means not loaded yet.
 */
export function useUpcomingInvoice(): ResourceHandle<UpcomingInvoice | null> {
  return useBillingResource("upcomingInvoice", SINGLETON);
}

export interface PaymentMethodsHandle extends ResourceHandle<PaymentMethod[]> {
  /**
   * Makes `externalId` the default; `data` reloads once it has. Rejects
   * with the failure and records it on `mutationError`, so a caller can
   * await it or read it, whichever the component does.
   */
  setDefault: (externalId: string) => Promise<void>;
  /** Removes payment method `id`; `data` reloads once it has. Rejects as `setDefault` does. */
  remove: (id: string) => Promise<void>;
  /** A write is in flight. Distinct from `isPending`, which is the list loading. */
  isMutating: boolean;
  /** The last write's failure; cleared when the next write starts. */
  mutationError: Error | undefined;
}

interface Mutation {
  inflight: number;
  error: Error | undefined;
}

const IDLE: Mutation = { inflight: 0, error: undefined };

/**
 * The company's payment methods, with the writes on them. `data` is the
 * list, `isPending` and `error` its load, and `isMutating` and
 * `mutationError` the last write; a write's failure never lands on `error`,
 * which stays the list's own.
 *
 * Writes are not coalesced: a second call while one is in flight runs too,
 * the store reloads the list after each, and `isMutating` stays true until
 * the last lands. A component that wants one at a time disables its buttons
 * on `isMutating`.
 */
export function usePaymentMethods(): PaymentMethodsHandle {
  const source = useBillingDataSource();
  const handle = useBillingResource("paymentMethods", SINGLETON);
  const [mutation, setMutation] = useState<Mutation>(IDLE);

  const run = useCallback(async (write: () => Promise<void>) => {
    // Cleared when the write starts, like a resource's error on refetch, so
    // a retry reads as in progress rather than still failed.
    setMutation((m) => ({ inflight: m.inflight + 1, error: undefined }));
    try {
      await write();
    } catch (cause: unknown) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      setMutation((m) => ({ inflight: m.inflight - 1, error }));
      throw error;
    }
    setMutation((m) => ({ inflight: m.inflight - 1, error: undefined }));
  }, []);

  const setDefault = useCallback(
    (externalId: string) =>
      run(() => actionsOf(source).setDefaultPaymentMethod(externalId)),
    [run, source],
  );
  const remove = useCallback(
    (id: string) => run(() => actionsOf(source).removePaymentMethod(id)),
    [run, source],
  );

  return useMemo(
    () => ({
      ...handle,
      setDefault,
      remove,
      isMutating: mutation.inflight > 0,
      mutationError: mutation.error,
    }),
    [handle, mutation, remove, setDefault],
  );
}

export interface SetupIntentHandle {
  /** A new intent every call: an intent is single-use, so none is kept. */
  create: () => Promise<SetupIntent>;
}

/**
 * Mints setup intents for adding a payment method. The first action-only
 * hook on the billing store: it subscribes to no resource, reports no state,
 * and rejects with the failure. Once the provider confirms the intent, the
 * list is reloaded by whoever adds the method — `refetch` on
 * `usePaymentMethods`, or `useInvalidateBillingData`.
 */
export function useSetupIntent(): SetupIntentHandle {
  const source = useBillingDataSource();
  return useMemo(
    () => ({ create: () => actionsOf(source).createSetupIntent() }),
    [source],
  );
}

/** Reloads every loaded billing resource (after a plan change, for instance). */
export function useInvalidateBillingData(): () => void {
  return useBillingDataSource().invalidateAll;
}
