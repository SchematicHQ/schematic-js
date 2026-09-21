import React, { useEffect, useMemo, useRef } from "react";

import { sessionKey } from "@schematichq/schematic-js";

import { SchematicI18nProvider, type SchematicI18nConfig } from "../i18n";

import { BillingStore, type SessionInput } from "./client";
import {
  BillingDataContext,
  type BillingDataSource,
  type ResourceHandle,
} from "./context";
import type {
  BillingData,
  BillingProviderClient,
  BillingResourceName,
  BillingResourceParams,
  BillingResources,
  ResourceState,
} from "./contract";
import type { Resource } from "./store";

interface BillingProviderDataProps {
  /**
   * Required: this provider does not build one, and without it every hook
   * reports the missing-source error and `session` has nowhere to go.
   * `SchematicProvider` constructs one from its publishable key and renders
   * this underneath, which is the usual path.
   */
  billingClient?: BillingProviderClient;
  /**
   * Read once, at mount. A prefetch stamped with its session paints on the
   * first render only if `session` is stated on that render; under
   * `undefined` it is held until the session starts. On a server-rendered
   * page, state the pair on the first client render — `token` may be an
   * async provider — or hydration will not match.
   */
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
 * A client left over from an earlier mount and one another live provider is
 * reading look the same from here, so this names only what is observable.
 */
export const SESSION_REPLACED_MESSAGE =
  "BillingProvider is moving its billingClient from one session to another. A client holds one session: if another provider shares this client, each will keep installing its own and show the other's data. Give each provider its own client.";

/**
 * Provides the billing hooks from a `BillingStore` over a `BillingProviderClient`.
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

  // As stated, token included: the client absorbs a same-pair restatement,
  // and a stamp added here could only guess whose token the host minted.
  const install = () => {
    billingClient?.setSession?.(session);
  };

  // Two providers over one client overwrite each other's session. A warning,
  // not an error: a client kept across mounts trips the same check.
  useEffect(() => {
    const claim = billingClient?.sessionKey;
    if (
      claim !== undefined &&
      session !== null &&
      session !== undefined &&
      claim !== sessionKey(session)
    ) {
      console.warn(SESSION_REPLACED_MESSAGE);
    }
    // Only the state at mount is in question: a later change is this
    // provider's own session moving on.
  }, []);

  // Never during render: a client another store is listening to would reset
  // that store, and every subscriber, mid-render. Children subscribe before
  // this runs; the store holds them until `connect()` below.
  useEffect(install);

  // Only the first store that commits is seeded: one rebuilt for another
  // client would adopt rows the first has refetched past. Marked from an
  // effect because StrictMode runs the memo twice and keeps the second.
  const seedSpent = useRef(false);
  const store = useMemo(
    () =>
      billingClient === undefined
        ? undefined
        : new BillingStore(
            billingClient,
            seedSpent.current ? undefined : initialRef.current,
            {
              // What `install` is about to say, so a stamped prefetch is
              // judged now rather than after the effect.
              session,
            },
          ),
    // `session` is read only when the store is built: the client learns
    // later sessions through `install`, and the store through the client.
    [billingClient],
  );
  useEffect(() => {
    if (store !== undefined) {
      seedSpent.current = true;
    }
  }, [store]);

  // After `install`, so the store opens under the session this provider
  // stated. Armed and torn down together so StrictMode's remount leaves it
  // listening.
  useEffect(() => store?.connect(), [store]);

  const source = useMemo<BillingDataSource | undefined>(() => {
    if (store === undefined) {
      return initialRef.current === undefined
        ? undefined
        : staticSource(initialRef.current);
    }
    // `useSyncExternalStore` needs the same handle while nothing changed, and
    // a `Resource` replaces its snapshot object on every change, so snapshot
    // identity is the comparison. Weak, so an evicted resource takes its
    // handle with it; a bounded cache thrashes once keys outnumber its slots.
    const handles = new WeakMap<
      Resource<unknown>,
      { snapshot: ResourceState<unknown>; handle: ResourceHandle<unknown> }
    >();
    const handle = <K extends BillingResourceName>(
      name: K,
      params: BillingResourceParams[K],
    ): ResourceHandle<BillingResources[K]> => {
      const resource = store.resource(name).get(params) as Resource<unknown>;
      const snapshot = resource.getSnapshot();
      const cached = handles.get(resource);
      if (cached !== undefined && cached.snapshot === snapshot) {
        return cached.handle as ResourceHandle<BillingResources[K]>;
      }
      const next: ResourceHandle<unknown> = {
        ...snapshot,
        refetch: () => void resource.refetch(),
      };
      handles.set(resource, { snapshot, handle: next });
      return next as ResourceHandle<BillingResources[K]>;
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
