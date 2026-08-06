import * as SchematicJS from "@schematichq/schematic-js";
import { useContext, useEffect, useMemo, useSyncExternalStore } from "react";

import { SchematicContext } from "../context";

export interface SchematicHookResult<T> {
  data: T | undefined;
  /** No data yet and a fetch is (or is about to be) in flight. */
  isPending: boolean;
  /** A fetch is in flight while previous data is still shown. */
  isRefetching: boolean;
  error: Error | undefined;
  refetch: () => Promise<void>;
}

/**
 * Subscribes a component to a Resource. The fetch is kicked off in an effect,
 * so nothing runs during SSR; until then the idle state reports isPending so
 * first paint shows a loading state rather than "no data".
 */
export function useResource<T>(
  resource: SchematicJS.Resource<T>,
): SchematicHookResult<T> {
  const state = useSyncExternalStore(
    resource.subscribe,
    resource.getSnapshot,
    resource.getSnapshot,
  );

  useEffect(() => {
    resource.ensure();
  }, [resource]);

  return useMemo(
    () => ({
      data: state.data,
      isPending:
        state.isPending ||
        (state.data === undefined && state.error === undefined),
      isRefetching: state.isRefetching,
      error: state.error,
      refetch: resource.refetch,
    }),
    [state, resource],
  );
}

export interface SchematicCustomerHookOpts {
  /**
   * Explicit client, e.g. a module singleton. When omitted, the client comes
   * from the nearest SchematicProvider.
   */
  client?: SchematicJS.SchematicCustomerClient;
}

/**
 * Resolves the SchematicCustomerClient: an explicit `opts.client` wins,
 * otherwise the nearest SchematicProvider's client. The context accessor for
 * invalidate(), escape-hatch resources, and raw `client.api.*` calls.
 */
export function useSchematicCustomerClient(
  opts?: SchematicCustomerHookOpts,
): SchematicJS.SchematicCustomerClient {
  // Read the context unconditionally (hook-order rules), but only require it
  // when no explicit client was given — provider-less usage is supported.
  const context = useContext(SchematicContext);
  if (opts?.client !== undefined) {
    return opts.client;
  }
  if (context?.customerClient !== undefined) {
    return context.customerClient;
  }
  throw new Error(
    context === null
      ? "useSchematicCustomerClient must be used within a SchematicProvider, or be passed a client explicitly ({ client })."
      : "This SchematicProvider has no customer client (no publishableKey or accessToken was configured); pass a client explicitly ({ client }) or configure the provider.",
  );
}

export type UseSubscriptionOpts = SchematicCustomerHookOpts;

/**
 * The customer's current standing: active plan, subscription, payment method,
 * upcoming invoice, feature usage, and credit grants. Requires an access
 * token (company context comes from the token). Shares its fetch with
 * company-mode useCatalog.
 */
export function useSubscription(
  opts?: UseSubscriptionOpts,
): SchematicHookResult<SchematicJS.CustomerSubscription> {
  const client = useSchematicCustomerClient(opts);
  // client.hydrate throws with a descriptive message when the client has no
  // access-token mode; surfacing that at render time is intentional.
  const result = useResource(client.hydrate);

  const data = useMemo(
    () =>
      result.data === undefined
        ? undefined
        : SchematicJS.toSubscription(result.data),
    [result.data],
  );

  return useMemo(() => ({ ...result, data }), [result, data]);
}

export type UseCatalogOptions = SchematicCustomerHookOpts & {
  /**
   * Which catalog to fetch. "public" uses the publishable key
   * (GET /public/plans); "company" uses the access token
   * (GET /components/hydrate) and annotates plans with company context.
   * "auto" (default) picks "company" when the client has an access token.
   */
  mode?: SchematicJS.CatalogMode | "auto";
};

/** Catalog of purchasable plans and add-ons, e.g. for a pricing table. */
export function useCatalog(
  opts?: UseCatalogOptions,
): SchematicHookResult<SchematicJS.Catalog> {
  const client = useSchematicCustomerClient(opts);
  const mode: SchematicJS.CatalogMode =
    opts?.mode === undefined || opts.mode === "auto"
      ? client.hasAccessTokenMode
        ? "company"
        : "public"
      : opts.mode;

  const resource: SchematicJS.Resource<
    | SchematicJS.ComponentHydrateResponseData
    | SchematicJS.PublicPlansResponseData
  > = mode === "company" ? client.hydrate : client.publicPlans;
  const result = useResource(resource);

  const data = useMemo(() => {
    if (result.data === undefined) {
      return undefined;
    }
    return mode === "company"
      ? SchematicJS.toCatalogFromHydrate(
          result.data as SchematicJS.ComponentHydrateResponseData,
        )
      : SchematicJS.toCatalogFromPublic(
          result.data as SchematicJS.PublicPlansResponseData,
        );
  }, [result.data, mode]);

  return useMemo(() => ({ ...result, data }), [result, data]);
}

export type UseInvoicesOptions = SchematicCustomerHookOpts & {
  /** Max invoices to fetch (API default 100, max 250). */
  limit?: number;
  offset?: number;
};

/**
 * The customer's latest invoices (GET /components/invoices). Requires an
 * access token; the company is resolved from the token, never passed
 * explicitly.
 */
export function useInvoices(
  opts?: UseInvoicesOptions,
): SchematicHookResult<SchematicJS.InvoiceResponseData[]> {
  const client = useSchematicCustomerClient(opts);
  return useResource(
    client.invoices({ limit: opts?.limit, offset: opts?.offset }),
  );
}
