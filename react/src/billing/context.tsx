import React, { createContext, useContext, useMemo } from "react";

import { SchematicI18nProvider, type SchematicI18nConfig } from "../i18n";

import type {
  BillingData,
  BillingResourceName,
  BillingResourceParams,
  BillingResources,
  InvoiceQuery,
  ResourceState,
} from "./contract";

export interface ResourceHandle<T> extends ResourceState<T> {
  refetch: () => void;
}

/**
 * The seam between the hooks and whatever supplies data: the provider's
 * store, a server prefetch, or fixtures.
 */
export interface BillingDataSource {
  /**
   * Sources that hold one value per resource (fixtures, prefetch) serve it
   * for every parameter set.
   */
  subscribe<K extends BillingResourceName>(
    name: K,
    params: BillingResourceParams[K],
    listener: () => void,
  ): () => void;
  handle<K extends BillingResourceName>(
    name: K,
    params: BillingResourceParams[K],
  ): ResourceHandle<BillingResources[K]>;
  /** Never rejects: a failure lands on the resource's `error`. */
  loadMoreInvoices: (query: InvoiceQuery) => Promise<void>;
  invalidateAll: () => void;
}

export const BillingDataContext = createContext<BillingDataSource | undefined>(
  undefined,
);

export const MISSING_BILLING_SOURCE_MESSAGE =
  "Schematic billing hooks need a SchematicProvider with a session, billingClient, or initialData, or a BillingDataProvider.";

const missingSourceError = new Error(MISSING_BILLING_SOURCE_MESSAGE);

// `useSyncExternalStore` requires `getSnapshot` to return the same reference
// while nothing changed, so every source hands out cached handles.
const missingHandle: ResourceHandle<never> = {
  data: undefined,
  error: missingSourceError,
  isPending: false,
  refetch: () => {},
};

/**
 * Used outside any provider: every resource fails with the missing-source
 * error, so the misconfiguration arrives through the same channel as any
 * other failure instead of throwing.
 */
export const missingBillingSource: BillingDataSource = {
  subscribe: () => () => {},
  handle: () => missingHandle,
  loadMoreInvoices: () => Promise.resolve(),
  invalidateAll: () => {},
};

export function useBillingDataSource(): BillingDataSource {
  return useContext(BillingDataContext) ?? missingBillingSource;
}

/** Per-resource status overrides, for fixtures that simulate loading and failure. */
export type BillingDataStatus = {
  [K in BillingResourceName]?: {
    isPending?: boolean;
    error?: Error;
  };
};

interface BillingDataProviderDataProps {
  /** A missing key reports as pending. */
  data: BillingData;
  /** Simulated loading / failure per resource; wins over `data`. */
  status?: BillingDataStatus;
  onRefetch?: (name: BillingResourceName) => void;
  onLoadMoreInvoices?: (query: InvoiceQuery) => void;
  children?: React.ReactNode;
}

/**
 * Feeds the billing hooks from plain data with no fetching: fixtures,
 * stories, tests, or a fully prefetched page. The i18n props configure a
 * `SchematicI18nProvider` around the children and never touch the data seam.
 */
export type BillingDataProviderProps = BillingDataProviderDataProps &
  SchematicI18nConfig;

export function BillingDataProvider({
  children,
  data,
  locale,
  onLoadMoreInvoices,
  onMissingString,
  onRefetch,
  status,
  strings,
  translate,
}: BillingDataProviderProps) {
  const source = useMemo<BillingDataSource>(() => {
    const handles = new Map<BillingResourceName, ResourceHandle<unknown>>();
    return {
      subscribe: () => () => {},
      handle: (name) => {
        const cached = handles.get(name);
        if (cached !== undefined) {
          return cached as never;
        }
        const value = data[name];
        const override = status?.[name];
        const handle = {
          data: value,
          error: override?.error,
          isPending: override?.isPending ?? value === undefined,
          refetch: () => onRefetch?.(name),
        };
        handles.set(name, handle);
        return handle as never;
      },
      loadMoreInvoices: (query) => {
        onLoadMoreInvoices?.(query);
        return Promise.resolve();
      },
      invalidateAll: () => {},
    };
  }, [data, onLoadMoreInvoices, onRefetch, status]);

  return (
    <BillingDataContext.Provider value={source}>
      <SchematicI18nProvider
        locale={locale}
        strings={strings}
        translate={translate}
        onMissingString={onMissingString}
      >
        {children}
      </SchematicI18nProvider>
    </BillingDataContext.Provider>
  );
}
