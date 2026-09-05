import React, { useEffect, useMemo, useRef } from "react";

import { SchematicI18nProvider, type SchematicI18nConfig } from "../i18n";

import {
  CompanyStore,
  type AccessToken,
  type AccessTokenProvider,
  type CompanyClient,
} from "./client";
import {
  CompanyDataContext,
  type CompanyDataSource,
  type ResourceHandle,
} from "./context";
import type {
  CompanyData,
  CompanyResourceName,
  CompanyResourceParams,
  CompanyResources,
} from "./contract";
import type { Resource } from "./store";

interface CompanyProviderDataProps {
  /**
   * The company API client. Required: this provider does not build one, and
   * without it every hook reports the missing-source error and `accessToken`
   * has nowhere to go. `SchematicProvider` constructs one from its
   * publishable key and renders this underneath, which is the usual path.
   */
  companyClient?: CompanyClient;
  /** Forwarded to the client; a change resets every resource. */
  accessToken?: AccessToken;
  /** Prefetched data to seed the store with, so the first render is complete. */
  initialData?: CompanyData;
  /**
   * The host's name for the session — a company id, say. A change drops
   * every loaded resource.
   *
   * Only needed with a provider function for `accessToken`, and there it is
   * the only signal there is. The client is handed one stable function for
   * the life of this component — an inline arrow changes identity every
   * render, so its identity cannot mean anything — which leaves nothing in
   * the function or in the token it returns to say the company behind it
   * changed. Without `sessionKey` a swap goes unnoticed entirely. A string
   * `accessToken` needs none of this: its value says everything.
   */
  sessionKey?: string | null;
  children?: React.ReactNode;
}

/**
 * The data props plus the i18n ones, which are forwarded to a
 * `SchematicI18nProvider` and never reach the data seam.
 */
export type CompanyProviderProps = CompanyProviderDataProps &
  SchematicI18nConfig;

/**
 * Reported when the stable provider is called after the `accessToken` prop
 * has stopped being a provider — the client asking for a token the host no
 * longer supplies. Matches the message the client raises for a missing one.
 */
const MISSING_ACCESS_TOKEN_MESSAGE =
  "An access token is required to read company data.";

/**
 * Provides the company hooks from a `CompanyStore` over a `CompanyClient`.
 * Rendered by `SchematicProvider`; usable on its own with a client.
 */
export function CompanyProvider({
  accessToken,
  companyClient,
  children,
  initialData,
  locale,
  onMissingString,
  sessionKey,
  strings,
  translate,
}: CompanyProviderProps) {
  // The seed is read once: later prop changes never overwrite live data.
  const initialRef = useRef(initialData);

  // A host that writes `accessToken={async () => …}` inline — the shape the
  // docs recommend — hands over a new function on every render, and the
  // behaviour behind each one is the same. So the client is given a single
  // provider that reads the latest prop, and never sees the churn; what
  // identifies the session is the token that provider resolves to.
  // Written during render, not in an effect: the client can call the provider
  // from a fetch that a render-phase install has already set going, which is
  // before any effect of this component has run.
  const latestToken = useRef(accessToken);
  latestToken.current = accessToken;
  const stableProvider = useRef<AccessTokenProvider>(() => {
    const current = latestToken.current;
    return typeof current === "function"
      ? current()
      : Promise.reject(new Error(MISSING_ACCESS_TOKEN_MESSAGE));
  }).current;
  const forwarded =
    typeof accessToken === "function" ? stableProvider : accessToken;

  // Forwarding only on a change keeps a client configured with its own token
  // from being cleared by a provider that never set one.
  const installed = useRef<{
    client?: CompanyClient;
    token?: AccessToken;
    session?: string | null;
  }>({});
  const install = () => {
    // A provider that has never supplied a token leaves the client's own
    // alone — forwarding `undefined` alongside the session would clear a
    // token this host never gave. The session still gets through: it is a
    // statement about which company is being read, and a host with its own
    // client makes it the same way everyone else does.
    if (forwarded === undefined && installed.current.token === undefined) {
      if (
        installed.current.session !== sessionKey ||
        installed.current.client !== companyClient
      ) {
        installed.current = {
          ...installed.current,
          client: companyClient,
          session: sessionKey,
        };
        companyClient?.setSession?.(sessionKey);
      }
      return;
    }
    if (
      installed.current.token === forwarded &&
      installed.current.session === sessionKey &&
      installed.current.client === companyClient
    ) {
      return;
    }
    installed.current = {
      client: companyClient,
      token: forwarded,
      session: sessionKey,
    };
    companyClient?.setAccessToken?.(forwarded, sessionKey);
  };

  // The first install on a client happens during render, because a child's
  // subscription effect runs before this component's and would otherwise
  // fetch before the token arrives. It is safe there precisely because the
  // client is new to us: its store is connected from an effect, so nothing
  // is listening yet and `setAccessToken` can reach no mounted component.
  //
  // Tracked separately from `installed`, and marked whether or not anything
  // was forwarded: a pass that installed nothing has still had its chance,
  // and leaving the branch armed would let a token arriving later — after
  // the children have subscribed — reset the store from inside a render.
  const renderPass = useRef<{ done: boolean; client?: CompanyClient }>({
    done: false,
  });
  if (!renderPass.current.done || renderPass.current.client !== companyClient) {
    renderPass.current = { done: true, client: companyClient };
    install();
  }
  // Every later change is on a client whose store *is* listening, so it goes
  // through an effect. Installing it during render would run the store's
  // reset — and the state updates that reach every subscriber — in the
  // middle of rendering this component.
  useEffect(install);

  const store = useMemo(
    () =>
      companyClient === undefined
        ? undefined
        : new CompanyStore(companyClient, initialRef.current),
    [companyClient],
  );

  // Arms the credentials listener and tears it down together, so StrictMode's
  // mount / unmount / remount leaves the store listening rather than deaf.
  useEffect(() => store?.connect(), [store]);

  const source = useMemo<CompanyDataSource | undefined>(() => {
    if (store === undefined) {
      return initialRef.current === undefined
        ? undefined
        : staticSource(initialRef.current);
    }
    // One entry per parameter set ever read. `KeyedResource` evicts the
    // resources themselves, so without a bound a host that varies its query
    // — a filter control — would keep every discarded resource and its page
    // alive here. Entries are kept in least-recently-read order and the
    // oldest is dropped, never the whole map: clearing it would hand every
    // component still on screen a new handle on each render, which is the
    // uncached `getSnapshot` React loops on.
    const handles = new Map<
      string,
      { resource: Resource<unknown>; handle: ResourceHandle<unknown> }
    >();
    const maxHandles = 32;
    const handle = <K extends CompanyResourceName>(
      name: K,
      params: CompanyResourceParams[K],
    ): ResourceHandle<CompanyResources[K]> => {
      const keyed = store.resource(name);
      const resource = keyed.get(params);
      const snapshot = resource.getSnapshot();
      const cacheKey = `${name}:${keyed.hash(params)}`;
      const cached = handles.get(cacheKey);
      // Keep handle identity stable per snapshot so useSyncExternalStore
      // does not re-render (or loop) on every read. The resource is part of
      // the match: an evicted key comes back as a fresh Resource whose empty
      // snapshot is indistinguishable from its predecessor's, and the stale
      // handle's `refetch` would reload the discarded one.
      if (
        cached !== undefined &&
        cached.resource === resource &&
        cached.handle.data === snapshot.data &&
        cached.handle.error === snapshot.error &&
        cached.handle.isPending === snapshot.isPending
      ) {
        // Re-insert to move it to most-recently-read.
        handles.delete(cacheKey);
        handles.set(cacheKey, cached);
        return cached.handle as ResourceHandle<CompanyResources[K]>;
      }
      const next: ResourceHandle<CompanyResources[K]> = {
        ...snapshot,
        refetch: () => void resource.refetch(),
      };
      if (handles.size >= maxHandles && !handles.has(cacheKey)) {
        const oldest = handles.keys().next().value;
        if (oldest !== undefined) {
          handles.delete(oldest);
        }
      }
      handles.set(cacheKey, {
        resource: resource as Resource<unknown>,
        handle: next,
      });
      return next;
    };
    return {
      subscribe: (name, params, listener) =>
        store.resource(name).subscribe(params, listener),
      handle,
      loadMoreInvoices: (query) => store.loadMoreInvoices(query),
      invalidateAll: () => store.invalidateAll(),
    };
  }, [store]);

  // i18n wraps the children either way: the elements' copy and locale do not
  // depend on there being a data source, and a host with neither a client nor
  // prefetched data still gets its own words in the status frames.
  const localized = (
    <SchematicI18nProvider
      locale={locale}
      strings={strings}
      translate={translate}
      onMissingString={onMissingString}
    >
      {children}
    </SchematicI18nProvider>
  );

  if (source === undefined) {
    // Nothing to provide: hooks below fall back to the missing-source error.
    return localized;
  }

  return (
    <CompanyDataContext.Provider value={source}>
      {localized}
    </CompanyDataContext.Provider>
  );
}

/** A source over prefetched data alone (no client): serves it, never fetches. */
function staticSource(data: CompanyData): CompanyDataSource {
  const handles = new Map<CompanyResourceName, ResourceHandle<unknown>>();
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
    loadMoreInvoices: () => Promise.resolve(),
    invalidateAll: () => {},
  };
}
