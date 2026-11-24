import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import type {
  BillingResourceName,
  BillingResourceParams,
  BillingResources,
  Catalog,
  CatalogQuery,
  CatalogView,
  Checkout,
  CheckoutDraftState,
  CheckoutPriceSnapshot,
  CheckoutResult,
  CheckoutSelections,
  CheckoutTransport,
  Company,
  CreditBalanceEntry,
  CreditLedgerPage,
  CreditLedgerQuery,
  CreditOverdraft,
  CreditOverdraftUpdate,
  CreditUserUsage,
  FeatureUsage,
  FeatureUserUsage,
  InvoicePage,
  InvoiceQuery,
  PaymentMethod,
  PublicCatalog,
  SetupIntent,
  TaxId,
  TaxIdInput,
  UpcomingInvoice,
} from "./contract";
import {
  CheckoutDraft,
  DEFAULT_CATALOG_QUERY,
  DEFAULT_CREDIT_LEDGER_QUERY,
  DEFAULT_INVOICE_QUERY,
  SINGLETON,
  normalizeCatalogQuery,
  normalizeCreditLedgerQuery,
  normalizeInvoiceQuery,
} from "./contract";
import {
  actionsOf,
  useBillingDataSource,
  type CatalogSource,
  type ResourceHandle,
} from "./context";
import { hashKey } from "./store";

/**
 * Hooks never fetch during server rendering: without `initialData` they
 * report pending on the server and load on the client. `useCatalog`,
 * `useInvoices`, `useUpcomingInvoice`, `usePaymentMethods`, `useFeatureUsage`,
 * `useFeatureUserUsage`, `useCreditBalances`, `useCreditLedger`, `useCreditUserUsage`,
 * `useCompany`, `useTaxIds` and `useOverageLimit` so far; the other resource
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

/**
 * The catalog as whoever is reading sees it. Signed in, the company's view:
 * what it can buy, and how it stands against each plan and add-on. Signed
 * out, or before the session resolves, the public catalog, read with the
 * publishable key; `data.source` says which, and a session starting swaps
 * one for the other. Without a `catalogId`, the catalog the environment
 * sells; an inline object literal is fine, the hook keys by value.
 */
export function useCatalog(
  query: CatalogQuery = DEFAULT_CATALOG_QUERY,
): ResourceHandle<CatalogView> {
  const source = useBillingDataSource();
  const params = useStableParams(normalizeCatalogQuery(query));
  const subscribeSource = useCallback(
    (listener: () => void) =>
      source.onSessionChange?.(() => listener()) ?? (() => {}),
    [source],
  );
  const readSource = useCallback(
    (): CatalogSource => source.catalogSource?.() ?? "company",
    [source],
  );
  const which = useSyncExternalStore(subscribeSource, readSource, readSource);
  // One resource at a time: subscribing to the other would fetch it too.
  const handle = useBillingResource<"catalog" | "publicCatalog">(
    which === "public" ? "publicCatalog" : "catalog",
    params,
  );
  return useMemo(() => {
    const { data } = handle;
    let view: CatalogView | undefined;
    if (data !== undefined) {
      view =
        which === "public"
          ? { source: "public", catalog: data as PublicCatalog }
          : { source: "company", catalog: data as Catalog };
    }
    return { ...handle, data: view };
  }, [handle, which]);
}

export interface InvoicesHandle extends ResourceHandle<InvoicePage> {
  /**
   * Requests the next page; appended to `data.invoices` when it arrives.
   * `isPending` is true while it is on the wire and `error` records a
   * failure, so a caller can track both without awaiting — the promise
   * never rejects.
   */
  loadMore: () => Promise<void>;
  /**
   * The current hosted URL for invoice `id`. The listed `url` can expire, so
   * a link asks for this when clicked. Rejects with the failure, which
   * leaves the list as it is.
   */
  fetchLink: (id: string) => Promise<string>;
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
  const fetchLink = useCallback(
    (id: string) => actionsOf(source).fetchInvoiceLink(id),
    [source],
  );
  return useMemo(
    () => ({ ...handle, loadMore, fetchLink }),
    [handle, loadMore, fetchLink],
  );
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

interface MutationTracker {
  run: (write: () => Promise<void>) => Promise<void>;
  isMutating: boolean;
  mutationError: Error | undefined;
}

function useMutation(): MutationTracker {
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

  return useMemo(
    () => ({
      run,
      isMutating: mutation.inflight > 0,
      mutationError: mutation.error,
    }),
    [mutation, run],
  );
}

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
  const { run, isMutating, mutationError } = useMutation();

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
      isMutating,
      mutationError,
    }),
    [handle, isMutating, mutationError, remove, setDefault],
  );
}

export interface SetupIntentHandle {
  /** A new intent every call: an intent is single-use, so none is kept. */
  create: () => Promise<SetupIntent>;
}

/**
 * Mints setup intents for adding a payment method. Subscribes to no
 * resource, reports no state, and rejects with the failure. Once the
 * provider confirms the intent, the list is reloaded by whoever adds the
 * method — `refetch` on `usePaymentMethods`, or `useInvalidateBillingData`.
 */
export function useSetupIntent(): SetupIntentHandle {
  const source = useBillingDataSource();
  return useMemo(
    () => ({ create: () => actionsOf(source).createSetupIntent() }),
    [source],
  );
}

export interface TaxIdsHandle extends ResourceHandle<TaxId[]> {
  /**
   * Sets the company's tax ID; `data` holds what is on file once it has.
   * Rejects with the failure and records it on `mutationError`.
   */
  update: (taxId: TaxIdInput) => Promise<void>;
  isMutating: boolean;
  mutationError: Error | undefined;
}

/**
 * The tax IDs on the company's billing customer, with the write that sets
 * one. `data` is empty when there are none; `undefined` means not loaded.
 */
export function useTaxIds(): TaxIdsHandle {
  const source = useBillingDataSource();
  const handle = useBillingResource("taxIds", SINGLETON);
  const [mutation, setMutation] = useState<Mutation>(IDLE);

  const update = useCallback(
    async (taxId: TaxIdInput) => {
      setMutation((m) => ({ inflight: m.inflight + 1, error: undefined }));
      try {
        await actionsOf(source).updateTaxId(taxId);
      } catch (cause: unknown) {
        const error = cause instanceof Error ? cause : new Error(String(cause));
        setMutation((m) => ({ inflight: m.inflight - 1, error }));
        throw error;
      }
      setMutation((m) => ({ inflight: m.inflight - 1, error: undefined }));
    },
    [source],
  );

  return useMemo(
    () => ({
      ...handle,
      update,
      isMutating: mutation.inflight > 0,
      mutationError: mutation.error,
    }),
    [handle, mutation, update],
  );
}

/**
 * Every feature the company is entitled to, with its usage. `data` is empty
 * when it is entitled to nothing; `undefined` is what means not loaded yet.
 */
export function useFeatureUsage(): ResourceHandle<FeatureUsage[]> {
  return useBillingResource("featureUsage", SINGLETON);
}

/**
 * One event-based feature's usage by user over its metric period: the
 * heaviest users, how many there are in all, and usage sent without a user.
 * A feature the company has no event-based entitlement to fails with a 404.
 */
export function useFeatureUserUsage(
  featureId: string,
): ResourceHandle<FeatureUserUsage> {
  const source = useBillingDataSource();
  const subscribe = useCallback(
    (listener: () => void) =>
      source.subscribeFeatureUserUsage(featureId, listener),
    [featureId, source],
  );
  const getSnapshot = useCallback(
    () => source.featureUserUsage(featureId),
    [featureId, source],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

/**
 * The company's plan and add-ons at their billed prices, its subscription,
 * any scheduled downgrade and any pending custom plan billing. `undefined`
 * means not loaded.
 */
export function useCompany(): ResourceHandle<Company> {
  return useBillingResource("company", SINGLETON);
}

/**
 * The company's credit balances, one per credit. `data` is empty when it
 * holds no credits and its plan draws on none; `undefined` means not loaded.
 */
export function useCreditBalances(): ResourceHandle<CreditBalanceEntry[]> {
  return useBillingResource("creditBalances", SINGLETON);
}

/**
 * One credit's consumption by user over the span of its live grants: the
 * heaviest users, how many there are in all, and consumption from events
 * sent without a user. Empty for a credit the company holds no live grant of.
 */
export function useCreditUserUsage(
  creditId: string,
): ResourceHandle<CreditUserUsage> {
  const source = useBillingDataSource();
  const subscribe = useCallback(
    (listener: () => void) =>
      source.subscribeCreditUserUsage(creditId, listener),
    [creditId, source],
  );
  const getSnapshot = useCallback(
    () => source.creditUserUsage(creditId),
    [creditId, source],
  );
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export interface UseCheckoutOptions {
  /** Resume this checkout rather than opening one on the first write. */
  checkoutId?: string;
}

export interface CheckoutHandle extends CheckoutDraftState {
  /** What the cart was last priced at; `undefined` until it is priceable. */
  snapshot: CheckoutPriceSnapshot | undefined;
  /**
   * Replaces the cart and re-prices it. Calls made while a write is out are
   * coalesced into the newest, so a component can call this on every change.
   * Rejects with the write's failure, which also lands on `error`.
   */
  setSelections: (
    selections: CheckoutSelections,
  ) => Promise<Checkout | undefined>;
  /**
   * Charges the cart once every write has landed, then reloads the billing
   * data the purchase changed. A refusal on the cart's problems puts them on
   * `problems` and rejects.
   */
  finalize: () => Promise<CheckoutResult>;
  /** Drops the checkout; the next write opens a new one. */
  reset: () => void;
}

/**
 * A persisted checkout: the first `setSelections` opens it, each later one
 * replaces the cart and re-prices it, and `finalize` charges it. The server
 * has no notion of steps, and neither does this: a component sequences its
 * own and hands over the whole cart each time it changes. One checkout per
 * component that calls this; the session changing drops it.
 */
export function useCheckout(options: UseCheckoutOptions = {}): CheckoutHandle {
  const source = useBillingDataSource();
  // Read at call time, so a provider that swaps its source mid-checkout is
  // the one the next write goes through.
  const sourceRef = useRef(source);
  sourceRef.current = source;

  const [draft] = useState(() => {
    const transport: CheckoutTransport = {
      createCheckout: (selections) =>
        actionsOf(sourceRef.current).createCheckout(selections),
      getCheckout: (id) => actionsOf(sourceRef.current).getCheckout(id),
      updateCheckout: (id, version, selections) =>
        actionsOf(sourceRef.current).updateCheckout(id, version, selections),
      finalizeCheckout: (id, version, opts) =>
        actionsOf(sourceRef.current).finalizeCheckout(id, version, opts),
    };
    return new CheckoutDraft(transport, { checkoutId: options.checkoutId });
  });

  // From an effect, not the draft's constructor: StrictMode builds the state
  // twice and keeps one, and a subscription made by the discarded one would
  // outlive it.
  useEffect(() => {
    const onSessionChange = source.onSessionChange;
    return onSessionChange === undefined
      ? undefined
      : draft.watchSession(onSessionChange);
  }, [draft, source]);

  const checkoutId = options.checkoutId;
  useEffect(() => {
    if (checkoutId !== undefined) {
      // A failed read leaves the draft as it was; the next write reports.
      draft.load().catch(() => undefined);
    }
  }, [checkoutId, draft]);

  const subscribe = useCallback(
    (listener: () => void) => draft.subscribe(listener),
    [draft],
  );
  const getSnapshot = useCallback(() => draft.state, [draft]);
  const state = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const invalidateAll = source.invalidateAll;
  const setSelections = useCallback(
    (selections: CheckoutSelections) => draft.setSelections(selections),
    [draft],
  );
  const finalize = useCallback(async () => {
    const result = await draft.finalize();
    // The plan, the add-ons, the bill and the balances all moved.
    invalidateAll();
    return result;
  }, [draft, invalidateAll]);
  const reset = useCallback(() => draft.reset(), [draft]);

  return useMemo(
    () => ({
      ...state,
      snapshot: state.checkout?.priceSnapshot,
      setSelections,
      finalize,
      reset,
    }),
    [finalize, reset, setSelections, state],
  );
}

/** A credit the company's plan bills past zero, and the balance it is on. */
export interface OverageCredit {
  balance: CreditBalanceEntry;
  overdraft: CreditOverdraft;
}

export type OverageCreditPick =
  | ({ status: "found" } & OverageCredit)
  | { status: "ambiguous" }
  | { status: "none" };

/**
 * Which credit's overage limit to show. `creditId` names one; without it,
 * the company's only credit that has an overdraft. Several such credits and
 * no `creditId` is `ambiguous`; a named credit without one is `none`.
 */
export function pickOverageCredit(
  balances: readonly CreditBalanceEntry[],
  creditId?: string,
): OverageCreditPick {
  const billed = balances.filter(
    (balance) =>
      balance.overdraft !== undefined &&
      balance.overdraft !== null &&
      (creditId === undefined || balance.creditId === creditId),
  );
  if (billed.length > 1 && creditId === undefined) {
    return { status: "ambiguous" };
  }
  const balance = billed[0];
  if (
    balance === undefined ||
    balance.overdraft === undefined ||
    balance.overdraft === null
  ) {
    return { status: "none" };
  }
  return { status: "found", balance, overdraft: balance.overdraft };
}

export interface UseOverageLimitOptions {
  /** The credit to read; the company's only credit with an overage limit when absent. */
  creditId?: string;
}

export interface OverageLimitHandle extends ResourceHandle<OverageCredit | null> {
  /**
   * `null` once the balances load when there is no such credit, or several
   * and no `creditId`; `ambiguous` says which. `undefined` means not loaded.
   */
  data: OverageCredit | null | undefined;
  /** Several credits have an overage limit and no `creditId` picked one. */
  ambiguous: boolean;
  /**
   * Sets the company's own limit, in credits; the balances reload once it
   * has. Rejects with the failure and records it on `mutationError`.
   */
  save: (update: CreditOverdraftUpdate) => Promise<void>;
  /** Returns the limit to the plan's default. Rejects as `save` does. */
  reset: () => Promise<void>;
  isMutating: boolean;
  mutationError: Error | undefined;
}

/**
 * One credit's overage limit, read from the credit balances, with the writes
 * that set and reset it. `error` and `isPending` are the balances' load.
 */
export function useOverageLimit(
  options: UseOverageLimitOptions = {},
): OverageLimitHandle {
  const { creditId } = options;
  const source = useBillingDataSource();
  const handle = useBillingResource("creditBalances", SINGLETON);
  const { run, isMutating, mutationError } = useMutation();

  const pick = useMemo(
    () =>
      handle.data === undefined
        ? undefined
        : pickOverageCredit(handle.data, creditId),
    [creditId, handle.data],
  );
  const pickedId = pick?.status === "found" ? pick.balance.creditId : undefined;

  const save = useCallback(
    (update: CreditOverdraftUpdate) =>
      run(() =>
        pickedId === undefined
          ? Promise.reject(new Error(NO_OVERAGE_CREDIT))
          : actionsOf(source).updateCreditOverdraft(pickedId, update),
      ),
    [pickedId, run, source],
  );
  const reset = useCallback(
    () =>
      run(() =>
        pickedId === undefined
          ? Promise.reject(new Error(NO_OVERAGE_CREDIT))
          : actionsOf(source).resetCreditOverdraft(pickedId),
      ),
    [pickedId, run, source],
  );

  return useMemo(() => {
    let data: OverageCredit | null | undefined;
    if (pick !== undefined) {
      data =
        pick.status === "found"
          ? { balance: pick.balance, overdraft: pick.overdraft }
          : null;
    }
    return {
      ...handle,
      data,
      ambiguous: pick?.status === "ambiguous",
      save,
      reset,
      isMutating,
      mutationError,
    };
  }, [handle, isMutating, mutationError, pick, reset, save]);
}

const NO_OVERAGE_CREDIT = "No credit with an overage limit to change.";

export interface CreditLedgerHandle extends ResourceHandle<CreditLedgerPage> {
  /** Requests the next page, as `InvoicesHandle.loadMore` does. */
  loadMore: () => Promise<void>;
}

/**
 * The company's credit activity for `query`, newest first: draws by feature
 * and user, grants, and expiries. Each distinct query is its own list with
 * its own paging; an inline object literal is fine, the hook keys by value.
 */
export function useCreditLedger(
  query: CreditLedgerQuery = DEFAULT_CREDIT_LEDGER_QUERY,
): CreditLedgerHandle {
  const source = useBillingDataSource();
  const params = useStableParams(normalizeCreditLedgerQuery(query));
  const handle = useBillingResource("creditLedger", params);
  const loadMore = useCallback(
    () => source.loadMoreCreditLedger(params),
    [params, source],
  );
  return useMemo(() => ({ ...handle, loadMore }), [handle, loadMore]);
}

/** Reloads every loaded billing resource (after a plan change, for instance). */
export function useInvalidateBillingData(): () => void {
  return useBillingDataSource().invalidateAll;
}

export interface UnsubscribeHandle {
  /**
   * Cancels the subscription at period end; the company, its next bill and
   * its credits reload once it lands. Rejects with the failure and records
   * it on `mutationError`.
   */
  unsubscribe: () => Promise<void>;
  /** The cancellation is in flight. */
  isMutating: boolean;
  /** The last attempt's failure; cleared when the next one starts. */
  mutationError: Error | undefined;
}

/**
 * Cancels the company's subscription. Subscribes to no resource: read the
 * subscription's state from `useCompany`, which reloads once this lands.
 */
export function useUnsubscribe(): UnsubscribeHandle {
  const source = useBillingDataSource();
  const [mutation, setMutation] = useState<Mutation>(IDLE);

  const unsubscribe = useCallback(async () => {
    setMutation((m) => ({ inflight: m.inflight + 1, error: undefined }));
    try {
      await actionsOf(source).unsubscribe();
    } catch (cause: unknown) {
      const error = cause instanceof Error ? cause : new Error(String(cause));
      setMutation((m) => ({ inflight: m.inflight - 1, error }));
      throw error;
    }
    setMutation((m) => ({ inflight: m.inflight - 1, error: undefined }));
  }, [source]);

  return useMemo(
    () => ({
      unsubscribe,
      isMutating: mutation.inflight > 0,
      mutationError: mutation.error,
    }),
    [mutation, unsubscribe],
  );
}
