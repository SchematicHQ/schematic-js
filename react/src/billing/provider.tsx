import React, { useEffect, useMemo, useRef } from "react";

import { sessionKey } from "@schematichq/schematic-js";

import { SchematicI18nProvider, type SchematicI18nConfig } from "../i18n";

import {
  BillingStore,
  type AccessToken,
  type AccessTokenProvider,
  type BillingClient,
  type SessionInput,
} from "./client";
import {
  BillingDataContext,
  type BillingDataSource,
  type ResourceHandle,
} from "./context";
import type {
  BillingData,
  BillingResourceName,
  BillingResourceParams,
  BillingResources,
} from "./contract";
import type { Resource } from "./store";

interface BillingProviderDataProps {
  /**
   * Required: this provider does not build one, and without it every hook
   * reports the missing-source error and `session` has nowhere to go.
   * `SchematicProvider` constructs one from its publishable key and renders
   * this underneath, which is the usual path.
   */
  billingClient?: BillingClient;
  initialData?: BillingData;
  /**
   * Who is being read, and the credential for it: `{ company, user?, token }`
   * while someone is signed in, `null` when nobody is, and `undefined` while
   * the host is still finding out.
   *
   * The (company, user) pair is the identity, so a token that rotates — a
   * provider called again, a closure rebuilt on a render — is the same
   * session and keeps what is loaded, while another pair drops it.
   * `undefined` states nothing, which is what an auth resolving
   * asynchronously renders first.
   */
  session?: SessionInput;
  children?: React.ReactNode;
}

/**
 * The i18n props are forwarded to a `SchematicI18nProvider` and never reach
 * the data seam.
 */
export type BillingProviderProps = BillingProviderDataProps &
  SchematicI18nConfig;

/**
 * Reported when the stable provider is called after the session's token has
 * stopped being a provider — the client asking for a token the host no
 * longer supplies.
 */
const MISSING_ACCESS_TOKEN_MESSAGE =
  "An access token is required to read billing data.";

/**
 * Reported once, at mount, when the client handed in is already reading
 * another session: a client holds one, so this provider and whoever set the
 * other will each keep installing theirs.
 */
export const SHARED_CLIENT_MESSAGE =
  "BillingProvider was given a billingClient that is already reading a different session. A client holds one session, so providers sharing it overwrite each other's; give each provider its own client.";

/**
 * Provides the billing hooks from a `BillingStore` over a `BillingClient`.
 * Rendered by `SchematicProvider`; usable on its own with a client.
 */
export function BillingProvider({
  billingClient,
  children,
  initialData,
  locale,
  onMissingString,
  session,
  strings,
  translate,
}: BillingProviderProps) {
  // The seed is read once: later prop changes never overwrite live data.
  const initialRef = useRef(initialData);

  // One provider handed to the client, so a host writing
  // `token: async () => …` inline does not restate the session every render.
  //
  // Written by `install`, never on its own during render: updated in render
  // while the statement waited for an effect, this would hand the next
  // company's token to a refresh made for the one the client still believes
  // it is on. The pair rides along so the client can decline it anyway.
  //
  // Only an active session sets it and only an ended one clears it: a host
  // saying `undefined` states nothing, so the token behind the session in
  // hand stays callable for a refresh landing in that window.
  const latestToken = useRef<
    { company: string; user?: string; token: AccessToken } | undefined
  >(undefined);
  const stableProvider = useRef<AccessTokenProvider>(async () => {
    const current = latestToken.current;
    if (typeof current?.token !== "function") {
      throw new Error(MISSING_ACCESS_TOKEN_MESSAGE);
    }
    const resolved = await current.token();
    // Stamped with the pair this token function was installed for: in
    // flight, nothing else says whose a token is, and the client needs that
    // to judge one that settled after the session moved on.
    if (typeof resolved === "string") {
      return { token: resolved, company: current.company, user: current.user };
    }
    // Per field, and only where the host stated nothing: overwriting a host's
    // own stamp would make the client's check compare the session prop
    // against itself and pass by construction — which is the case worth
    // catching, a pair and a token that move at different times.
    return {
      ...resolved,
      company: resolved.company ?? current.company,
      user: resolved.user ?? current.user,
    };
  }).current;

  const forwarded: SessionInput =
    session === null || session === undefined
      ? session
      : {
          company: session.company,
          user: session.user,
          token:
            typeof session.token === "function"
              ? stableProvider
              : session.token,
        };

  // The client ignores a statement that changes nothing, so this forwards
  // after every render rather than keeping its own record of what it last
  // said.
  const install = () => {
    if (session === null) {
      latestToken.current = undefined;
    } else if (session !== undefined) {
      latestToken.current = {
        company: session.company,
        user: session.user,
        token: session.token,
      };
    }
    billingClient?.setSession?.(forwarded);
  };

  // A client holds one session, so two providers over one client with
  // different sessions take turns installing theirs: the last to render
  // wins, the other shows its data, and each render of either resets both.
  // Said once, at mount, before this provider writes anything.
  useEffect(() => {
    const claim = billingClient?.sessionKey;
    if (
      claim !== undefined &&
      session !== null &&
      session !== undefined &&
      claim !== sessionKey(session)
    ) {
      console.error(SHARED_CLIENT_MESSAGE);
    }
    // Only the state at mount is in question: a later change is this
    // provider's own session moving on.
  }, []);

  // From an effect, never during render: a session landing on a client that
  // another store is already listening to runs that store's reset — and
  // every subscriber's state update — in the middle of rendering this
  // component. Children subscribe before this runs, but the store holds
  // them until `connect()` below, which comes after.
  useEffect(install);

  const store = useMemo(
    () =>
      billingClient === undefined
        ? undefined
        : new BillingStore(billingClient, initialRef.current, {
            // What `install` is about to say, so a prefetch whose session
            // was known at render is judged at render and paints at once.
            session,
          }),
    // `session` is read only when the store is built: the client learns
    // later sessions through `install`, and the store through the client.
    [billingClient],
  );

  // After `install`, in declaration order: connecting opens the store, and
  // it opens under the session this provider stated rather than whatever
  // the client held when the children subscribed. Arms the listener and
  // tears it down together, so StrictMode's mount / unmount / remount
  // leaves the store listening rather than deaf.
  useEffect(() => store?.connect(), [store]);

  const source = useMemo<BillingDataSource | undefined>(() => {
    if (store === undefined) {
      return initialRef.current === undefined
        ? undefined
        : staticSource(initialRef.current);
    }
    // Bounded because `KeyedResource` evicts resources but this map would
    // otherwise hold every discarded one alive. The oldest goes, never the
    // whole map: clearing it hands every subscriber a new handle each
    // render, and `useSyncExternalStore` loops on an uncached snapshot.
    const handles = new Map<
      string,
      { resource: Resource<unknown>; handle: ResourceHandle<unknown> }
    >();
    const maxHandles = 32;
    const handle = <K extends BillingResourceName>(
      name: K,
      params: BillingResourceParams[K],
    ): ResourceHandle<BillingResources[K]> => {
      const keyed = store.resource(name);
      const resource = keyed.get(params);
      const snapshot = resource.getSnapshot();
      const cacheKey = `${name}:${keyed.hash(params)}`;
      const cached = handles.get(cacheKey);
      // The resource is part of the match: an evicted key returns as a fresh
      // Resource whose empty snapshot is indistinguishable from its
      // predecessor's.
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
        return cached.handle as ResourceHandle<BillingResources[K]>;
      }
      const next: ResourceHandle<BillingResources[K]> = {
        ...snapshot,
        refetch: () => void resource.refetch(),
      };
      if (handles.size >= maxHandles && !handles.has(cacheKey)) {
        const oldest = handles.keys().next().value;
        if (oldest !== undefined) {
          handles.delete(oldest);
        }
      }
      // Deleted first so the write lands at the end: `set` on an existing
      // key keeps its position, leaving the most-read entry next to evict.
      handles.delete(cacheKey);
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

  // Rendered either way, so a host with neither a client nor prefetched
  // data still has its copy overrides in place.
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
    // Hooks below fall back to the missing-source error.
    return localized;
  }

  return (
    <BillingDataContext.Provider value={source}>
      {localized}
    </BillingDataContext.Provider>
  );
}

/** A source over prefetched data alone (no client): serves it, never fetches. */
function staticSource(data: BillingData): BillingDataSource {
  const handles = new Map<BillingResourceName, ResourceHandle<unknown>>();
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
