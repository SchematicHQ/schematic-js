import { createContext, useContext, useMemo } from "react";

import type {
  CatalogData,
  CatalogResourceName,
  CatalogResources,
  ResourceState,
} from "../contract";

/** What a hook hands an element: the resource's state plus a way to reload it. */
export interface ResourceHandle<T> extends ResourceState<T> {
  refetch: () => void;
}

/** Per-resource status overrides, for fixtures that simulate loading and failure. */
export type CatalogDataStatus = {
  [K in CatalogResourceName]?: {
    isPending?: boolean;
    error?: Error;
  };
};

export interface CatalogDataSource {
  resource<K extends CatalogResourceName>(
    name: K,
  ): ResourceHandle<CatalogResources[K]>;
  /** Asks for the next page of invoices; a no-op when the source has none. */
  loadMoreInvoices: () => void;
}

export const CatalogDataContext = createContext<CatalogDataSource | undefined>(
  undefined,
);

export const MISSING_PROVIDER_MESSAGE =
  "Schematic elements must be rendered inside a CatalogDataProvider.";

/**
 * A source that reports every resource as failed with the missing-provider
 * error, so an element rendered outside a provider shows the problem in its
 * status frame instead of crashing the host tree.
 */
const missingProviderSource: CatalogDataSource = {
  resource: () => ({
    data: undefined,
    error: new Error(MISSING_PROVIDER_MESSAGE),
    isPending: false,
    refetch: () => {},
  }),
  loadMoreInvoices: () => {},
};

export function useCatalogDataSource(): CatalogDataSource {
  return useContext(CatalogDataContext) ?? missingProviderSource;
}

export interface CatalogDataProviderProps {
  /** Resolved data per resource. A missing key reports as pending. */
  data: CatalogData;
  /** Simulated loading / failure per resource; wins over `data`. */
  status?: CatalogDataStatus;
  /** Called when an element retries a resource. */
  onRefetch?: (name: CatalogResourceName) => void;
  /** Called when the Invoices element asks for another page. */
  onLoadMoreInvoices?: () => void;
  children?: React.ReactNode;
}

/**
 * The Phase 1 data seam: feeds elements from plain data (fixtures, a server
 * prefetch) with no fetching of its own. Elements never read it directly —
 * they use the hooks in ./hooks.ts, whose signatures the real provider keeps.
 */
export function CatalogDataProvider({
  children,
  data,
  onLoadMoreInvoices,
  onRefetch,
  status,
}: CatalogDataProviderProps) {
  const source = useMemo<CatalogDataSource>(
    () => ({
      resource: (name) => {
        const value = data[name];
        const override = status?.[name];
        return {
          data: value,
          error: override?.error,
          isPending: override?.isPending ?? value === undefined,
          refetch: () => onRefetch?.(name),
        };
      },
      loadMoreInvoices: () => onLoadMoreInvoices?.(),
    }),
    [data, onLoadMoreInvoices, onRefetch, status],
  );

  return (
    <CatalogDataContext.Provider value={source}>
      {children}
    </CatalogDataContext.Provider>
  );
}
