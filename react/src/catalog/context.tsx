import React, { createContext, useContext, useMemo } from "react";

import type {
  CatalogData,
  CatalogResourceName,
  CatalogResources,
  ResourceState,
} from "./contract";

/** What a hook hands a consumer: the resource's state plus a way to reload it. */
export interface ResourceHandle<T> extends ResourceState<T> {
  refetch: () => void;
}

/**
 * The seam between the hooks and whatever supplies data: the provider's
 * store, a server prefetch, or fixtures.
 */
export interface CatalogDataSource {
  /** Subscribe to a resource; returns the current handle. */
  subscribe(name: CatalogResourceName, listener: () => void): () => void;
  handle<K extends CatalogResourceName>(
    name: K,
  ): ResourceHandle<CatalogResources[K]>;
  /** Asks for the next page of invoices; a no-op when there is none. */
  loadMoreInvoices: () => void;
  /** Reloads every loaded resource. */
  invalidateAll: () => void;
  /** The locale the elements should format in, when configured. */
  locale?: string;
}

export const CatalogDataContext = createContext<CatalogDataSource | undefined>(
  undefined,
);

export const MISSING_CATALOG_SOURCE_MESSAGE =
  "Schematic catalog hooks need a SchematicProvider with an accessToken, catalogClient, or initialData, or a CatalogDataProvider.";

const missingSourceError = new Error(MISSING_CATALOG_SOURCE_MESSAGE);

// useSyncExternalStore requires getSnapshot to return the same reference
// while nothing changed, so every source hands out cached handles.
const missingHandle: ResourceHandle<never> = {
  data: undefined,
  error: missingSourceError,
  isPending: false,
  refetch: () => {},
};

/**
 * Reported outside any provider: every resource fails with the
 * missing-source error so an element shows the problem in its status frame
 * instead of crashing the host tree.
 */
export const missingCatalogSource: CatalogDataSource = {
  subscribe: () => () => {},
  handle: () => missingHandle,
  loadMoreInvoices: () => {},
  invalidateAll: () => {},
};

export function useCatalogDataSource(): CatalogDataSource {
  return useContext(CatalogDataContext) ?? missingCatalogSource;
}

/** Per-resource status overrides, for fixtures that simulate loading and failure. */
export type CatalogDataStatus = {
  [K in CatalogResourceName]?: {
    isPending?: boolean;
    error?: Error;
  };
};

export interface CatalogDataProviderProps {
  /** Resolved data per resource. A missing key reports as pending. */
  data: CatalogData;
  /** Simulated loading / failure per resource; wins over `data`. */
  status?: CatalogDataStatus;
  /** Called when an element retries a resource. */
  onRefetch?: (name: CatalogResourceName) => void;
  /** Called when the Invoices element asks for another page. */
  onLoadMoreInvoices?: () => void;
  locale?: string;
  children?: React.ReactNode;
}

/**
 * Feeds the catalog hooks from plain data with no fetching: fixtures,
 * stories, tests, or a fully prefetched page.
 */
export function CatalogDataProvider({
  children,
  data,
  locale,
  onLoadMoreInvoices,
  onRefetch,
  status,
}: CatalogDataProviderProps) {
  const source = useMemo<CatalogDataSource>(() => {
    const handles = new Map<CatalogResourceName, ResourceHandle<unknown>>();
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
      loadMoreInvoices: () => onLoadMoreInvoices?.(),
      invalidateAll: () => {},
      locale,
    };
  }, [data, locale, onLoadMoreInvoices, onRefetch, status]);

  return (
    <CatalogDataContext.Provider value={source}>
      {children}
    </CatalogDataContext.Provider>
  );
}
