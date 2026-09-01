import React, { createContext, useContext, useMemo } from "react";

import { SchematicI18nProvider, type SchematicI18nConfig } from "../i18n";

import type {
  CompanyData,
  CompanyResourceName,
  CompanyResourceParams,
  CompanyResources,
  InvoiceQuery,
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
export interface CompanyDataSource {
  /**
   * Subscribe to a resource under its parameters. Sources that hold one
   * value per resource (fixtures, prefetch) serve it for every parameter set.
   */
  subscribe<K extends CompanyResourceName>(
    name: K,
    params: CompanyResourceParams[K],
    listener: () => void,
  ): () => void;
  handle<K extends CompanyResourceName>(
    name: K,
    params: CompanyResourceParams[K],
  ): ResourceHandle<CompanyResources[K]>;
  /**
   * Asks for the next page of the invoices list for `query`; a no-op when
   * there is none. Settles when the page does, and never rejects: a failure
   * lands on the resource's `error`.
   */
  loadMoreInvoices: (query: InvoiceQuery) => Promise<void>;
  /** Reloads every loaded resource. */
  invalidateAll: () => void;
}

export const CompanyDataContext = createContext<CompanyDataSource | undefined>(
  undefined,
);

export const MISSING_COMPANY_SOURCE_MESSAGE =
  "Schematic company hooks need a SchematicProvider with an accessToken, companyClient, or initialData, or a CompanyDataProvider.";

const missingSourceError = new Error(MISSING_COMPANY_SOURCE_MESSAGE);

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
export const missingCompanySource: CompanyDataSource = {
  subscribe: () => () => {},
  handle: () => missingHandle,
  loadMoreInvoices: () => Promise.resolve(),
  invalidateAll: () => {},
};

export function useCompanyDataSource(): CompanyDataSource {
  return useContext(CompanyDataContext) ?? missingCompanySource;
}

/** Per-resource status overrides, for fixtures that simulate loading and failure. */
export type CompanyDataStatus = {
  [K in CompanyResourceName]?: {
    isPending?: boolean;
    error?: Error;
  };
};

interface CompanyDataProviderDataProps {
  /** Resolved data per resource. A missing key reports as pending. */
  data: CompanyData;
  /** Simulated loading / failure per resource; wins over `data`. */
  status?: CompanyDataStatus;
  /** Called when an element retries a resource. */
  onRefetch?: (name: CompanyResourceName) => void;
  /** Called when the Invoices element asks for another page of `query`. */
  onLoadMoreInvoices?: (query: InvoiceQuery) => void;
  children?: React.ReactNode;
}

/**
 * Feeds the company hooks from plain data with no fetching: fixtures,
 * stories, tests, or a fully prefetched page. The i18n props are a
 * convenience — they configure a `SchematicI18nProvider` around the
 * children and never touch the data seam.
 */
export type CompanyDataProviderProps = CompanyDataProviderDataProps &
  SchematicI18nConfig;

export function CompanyDataProvider({
  children,
  data,
  locale,
  onLoadMoreInvoices,
  onMissingString,
  onRefetch,
  status,
  strings,
  translate,
}: CompanyDataProviderProps) {
  const source = useMemo<CompanyDataSource>(() => {
    const handles = new Map<CompanyResourceName, ResourceHandle<unknown>>();
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
    <CompanyDataContext.Provider value={source}>
      <SchematicI18nProvider
        locale={locale}
        strings={strings}
        translate={translate}
        onMissingString={onMissingString}
      >
        {children}
      </SchematicI18nProvider>
    </CompanyDataContext.Provider>
  );
}
