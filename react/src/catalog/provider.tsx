import React, { useEffect, useMemo, useRef } from "react";

import { CatalogStore, type AccessToken, type CatalogClient } from "./client";
import {
  CatalogDataContext,
  type CatalogDataSource,
  type ResourceHandle,
} from "./context";
import type {
  CatalogData,
  CatalogResourceName,
  CatalogResources,
} from "./contract";

export interface CatalogProviderProps {
  /** A catalog client; schematic-js builds one from the key and token when omitted. */
  catalogClient?: CatalogClient;
  /** Forwarded to the client; a change resets every resource. */
  accessToken?: AccessToken;
  /** Prefetched data to seed the store with, so the first render is complete. */
  initialData?: CatalogData;
  /** BCP 47 tag for formatting; elements default to the viewer's language. */
  locale?: string;
  children?: React.ReactNode;
}

/**
 * Provides the catalog hooks from a `CatalogStore` over a `CatalogClient`.
 * Rendered by `SchematicProvider`; usable on its own with a client.
 */
export function CatalogProvider({
  accessToken,
  catalogClient,
  children,
  initialData,
  locale,
}: CatalogProviderProps) {
  // The seed is read once: later prop changes never overwrite live data.
  const initialRef = useRef(initialData);

  // Forward the token prop only when it changes, so a client configured
  // with its own token is not cleared by a provider that never set one.
  const forwardedToken = useRef<AccessToken | undefined>(undefined);
  useEffect(() => {
    if (forwardedToken.current === accessToken) {
      return;
    }
    forwardedToken.current = accessToken;
    catalogClient?.setAccessToken?.(accessToken);
  }, [accessToken, catalogClient]);

  const store = useMemo(
    () =>
      catalogClient === undefined
        ? undefined
        : new CatalogStore(catalogClient, initialRef.current),
    [catalogClient],
  );

  useEffect(() => () => store?.dispose(), [store]);

  const source = useMemo<CatalogDataSource | undefined>(() => {
    if (store === undefined) {
      return initialRef.current === undefined
        ? undefined
        : staticSource(initialRef.current, locale);
    }
    const handles = new Map<CatalogResourceName, ResourceHandle<unknown>>();
    const handle = <K extends CatalogResourceName>(
      name: K,
    ): ResourceHandle<CatalogResources[K]> => {
      const resource = store.resource(name);
      const snapshot = resource.getSnapshot();
      const cached = handles.get(name);
      // Keep handle identity stable per snapshot so useSyncExternalStore
      // does not re-render (or loop) on every read.
      if (
        cached !== undefined &&
        cached.data === snapshot.data &&
        cached.error === snapshot.error &&
        cached.isPending === snapshot.isPending
      ) {
        return cached as ResourceHandle<CatalogResources[K]>;
      }
      const next: ResourceHandle<CatalogResources[K]> = {
        ...snapshot,
        refetch: () => void resource.refetch(),
      };
      handles.set(name, next);
      return next;
    };
    return {
      subscribe: (name, listener) => store.resource(name).subscribe(listener),
      handle,
      loadMoreInvoices: () => void store.loadMoreInvoices(),
      invalidateAll: () => store.invalidateAll(),
      locale,
    };
  }, [locale, store]);

  if (source === undefined) {
    // Nothing to provide: hooks below fall back to the missing-source error.
    return <>{children}</>;
  }

  return (
    <CatalogDataContext.Provider value={source}>
      {children}
    </CatalogDataContext.Provider>
  );
}

/** A source over prefetched data alone (no client): serves it, never fetches. */
function staticSource(data: CatalogData, locale?: string): CatalogDataSource {
  const handles = new Map<CatalogResourceName, ResourceHandle<unknown>>();
  return {
    subscribe: () => () => {},
    handle: (name) => {
      const cached = handles.get(name);
      if (cached !== undefined) {
        return cached as never;
      }
      const value = data[name];
      const next = {
        data: value,
        error: undefined,
        isPending: value === undefined,
        refetch: () => {},
      };
      handles.set(name, next);
      return next as never;
    },
    loadMoreInvoices: () => {},
    invalidateAll: () => {},
    locale,
  };
}
