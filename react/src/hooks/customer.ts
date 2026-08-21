import * as SchematicJS from "@schematichq/schematic-js";
import {
  useCallback,
  useContext,
  useEffect,
  useState,
  useSyncExternalStore,
} from "react";

import { SchematicContext } from "../context";

export interface UseCustomerResourceOpts {
  /** Bypass the provider and read from this client instead. */
  client?: SchematicJS.SchematicCustomerClient;
}

export type UseCustomerResourceResult<T> = SchematicJS.ResourceState<T> & {
  /** Unconditionally refetches, superseding any airborne request. */
  refetch: () => Promise<void>;
};

const MISSING_CLIENT_ERROR =
  "requires a SchematicProvider with a publishableKey or accessToken (or an explicit client)";

/**
 * Subscribes to a Resource on the customer client via useSyncExternalStore.
 * Accessor errors (no client configured, company-scoped resource without an
 * access token) surface as the hook's error state instead of throwing
 * through the component tree.
 */
const useCustomerResource = <T>(
  hookName: string,
  accessor: (
    client: SchematicJS.SchematicCustomerClient,
  ) => SchematicJS.Resource<T>,
  opts?: UseCustomerResourceOpts,
): UseCustomerResourceResult<T> => {
  const context = useContext(SchematicContext);
  const client = opts?.client ?? context?.customerClient;

  // Re-render when the client's credential mode changes (an access token
  // arriving after login turns useCompany's "requires accessToken" error
  // into a live resource).
  const subscribeConfig = useCallback(
    (listener: () => void) =>
      client?.subscribeConfiguration(listener) ?? (() => {}),
    [client],
  );
  const getHasAccessToken = useCallback(
    () => client?.hasAccessToken ?? false,
    [client],
  );
  useSyncExternalStore(subscribeConfig, getHasAccessToken, getHasAccessToken);

  // The accessor runs every render — it is a cheap cache lookup on the
  // client, returns a STABLE Resource per key, and throwing (no client, or
  // a company-scoped resource without an access token) is the error state.
  let resource: SchematicJS.Resource<T> | undefined;
  let accessError: Error | undefined;
  if (client === undefined) {
    accessError = new Error(`${hookName} ${MISSING_CLIENT_ERROR}`);
  } else {
    try {
      resource = accessor(client);
    } catch (err) {
      accessError = err instanceof Error ? err : new Error(String(err));
    }
  }

  const subscribe = useCallback(
    (listener: () => void) => resource?.subscribe(listener) ?? (() => {}),
    [resource],
  );
  const getSnapshot = useCallback(() => resource?.getSnapshot(), [resource]);
  const snapshot = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  useEffect(() => {
    void resource?.ensure();
  }, [resource]);

  const refetch = useCallback(
    () => resource?.refetch() ?? Promise.resolve(),
    [resource],
  );

  if (resource === undefined || snapshot === undefined) {
    return {
      data: undefined,
      error: accessError,
      isPending: false,
      isRefetching: false,
      refetch,
    };
  }
  return { ...snapshot, refetch };
};

/**
 * The catalog: what's on offer. The access token decides the shape —
 * company-decorated (current/valid/trial eligibility per plan) with one,
 * anonymous without — unless `mode: "public"` forces the anonymous catalog;
 * `data.mode` says which arrived. `catalogId` targets a specific catalog
 * instead of the environment default.
 */
export const useCatalog = (
  opts?: UseCustomerResourceOpts & SchematicJS.CatalogParams,
): UseCustomerResourceResult<SchematicJS.CustomerCatalog> => {
  const catalogId = opts?.catalogId;
  const mode = opts?.mode;
  return useCustomerResource(
    "useCatalog",
    (client) =>
      client.catalog({
        ...(catalogId !== undefined ? { catalogId } : {}),
        ...(mode !== undefined ? { mode } : {}),
      }),
    opts,
  );
};

/**
 * The company: its plan and held add-ons with the prices it pays,
 * subscription facts, custom billing, and any scheduled downgrade.
 * Requires accessToken.
 */
export const useCompany = (
  opts?: UseCustomerResourceOpts,
): UseCustomerResourceResult<SchematicJS.customerApi.CompanyContextResponseData> => {
  return useCustomerResource("useCompany", (client) => client.company(), opts);
};

/** The company's credit balances, grouped by credit. Requires accessToken. */
export const useCreditBalances = (
  opts?: UseCustomerResourceOpts,
): UseCustomerResourceResult<SchematicJS.customerApi.CompanyCreditBalancesResponseData> => {
  return useCustomerResource(
    "useCreditBalances",
    (client) => client.creditBalances(),
    opts,
  );
};

/**
 * The company's feature usage rows: the entitlement display block plus
 * usage facts per entitlement. Requires accessToken.
 */
export const useFeatureUsage = (
  opts?: UseCustomerResourceOpts,
): UseCustomerResourceResult<
  SchematicJS.customerApi.CompanyFeatureUsageResponseData[]
> => {
  return useCustomerResource(
    "useFeatureUsage",
    (client) => client.featureUsage(),
    opts,
  );
};

export type UseInvoicesResult =
  UseCustomerResourceResult<SchematicJS.InvoicePage> & {
    /** Whether another page exists beyond the rows held. */
    hasMore: boolean;
    /** Appends the next page of history to `data.rows`. */
    fetchMore: () => Promise<void>;
  };

/**
 * The company's invoice history, server-filtered and paged: `data.rows`
 * holds every page loaded so far, `fetchMore` appends the next one.
 * Requires accessToken.
 */
export const useInvoices = (
  params?: SchematicJS.ListInvoicesParams,
  opts?: UseCustomerResourceOpts,
): UseInvoicesResult => {
  const result = useCustomerResource(
    "useInvoices",
    (client) => client.invoices(params),
    opts,
  );
  const context = useContext(SchematicContext);
  const client = opts?.client ?? context?.customerClient;
  const fetchMore = useCallback(
    () => client?.fetchMoreInvoices(params) ?? Promise.resolve(),
    [client, params],
  );
  return { ...result, fetchMore, hasMore: result.data?.hasMore ?? false };
};

/**
 * The company's upcoming invoice, with customer-balance math precomputed;
 * data is null when there is nothing upcoming (no subscription). Requires
 * accessToken.
 */
export const useUpcomingInvoice = (
  opts?: UseCustomerResourceOpts,
): UseCustomerResourceResult<SchematicJS.customerApi.CompanyUpcomingInvoiceResponseData | null> => {
  return useCustomerResource(
    "useUpcomingInvoice",
    (client) => client.upcomingInvoice(),
    opts,
  );
};

/** The customer client from the provider, when one is configured. */
export const useSchematicCustomerClient = ():
  SchematicJS.SchematicCustomerClient | undefined => {
  return useContext(SchematicContext)?.customerClient;
};

/**
 * The provider-level locale, falling back to the browser's language; the
 * default every element and derivation formats with.
 */
export const useSchematicLocale = (): string | undefined => {
  const fromProvider = useContext(SchematicContext)?.locale;
  // The browser language is read in an effect so server and first client
  // render agree (undefined = the runtime default locale) and hydration
  // never mismatches on formatted numbers.
  const [browserLocale, setBrowserLocale] = useState<string | undefined>(
    undefined,
  );
  useEffect(() => {
    if (typeof navigator !== "undefined") {
      setBrowserLocale(navigator.language);
    }
  }, []);
  return fromProvider ?? browserLocale;
};
