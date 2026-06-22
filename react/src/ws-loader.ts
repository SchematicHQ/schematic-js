// Path C — Suspense-throw / effect-triggered activation for the WS adapter.
//
// Mirrors `embed-loader.ts`, but for the WS core surface. Lets the root
// entry stay free of a *static* reference to `@schematichq/schematic-js`:
// the WS adapter (which constructs `new Schematic(...)`) is reachable only
// via the dynamic `import()` below, so the client library is tree-shaken
// out of the eager graph and loaded lazily the first time a core hook is
// used.
//
// Two activation paths feed off this module (see `src/core/hooks.ts`):
//   * Client-returning hooks (`useSchematic`, `useSchematicEvents`,
//     `useSchematicContext`) throw `loadWsAdapter()` — Suspense catches it,
//     the bare provider's `useSyncExternalStore` fires once the import
//     resolves, and it re-renders with the adapter mounted.
//   * Value hooks (`useSchematicFlag`, etc.) call `loadWsAdapter()` from an
//     effect and render their fallback meanwhile, so they keep the
//     instant-fallback contract instead of suspending.
//
// The dynamic `import()` is the seam that lets esbuild emit the WS adapter
// as a separate chunk (with --splitting). In CJS builds it inlines instead,
// which is unavoidable without a separate runtime resolution strategy; see
// `scripts/check-tree-shake.mjs` for the policy.

import { createContext } from "react";

import { type SchematicAdapter } from "./provider";

type Subscriber = () => void;

let cached: SchematicAdapter | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<Subscriber>();

export function getCachedWsAdapter(): SchematicAdapter | null {
  return cached;
}

export function subscribeWsAdapter(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);

  return () => {
    subscribers.delete(subscriber);
  };
}

/**
 * Kicks off the WS adapter import (idempotent — subsequent calls return the
 * same in-flight promise). Throw the returned promise from a hook to trigger
 * React Suspense, or call it from an effect to start the load without
 * suspending; either way the bare provider's `useSyncExternalStore` fires
 * once the import resolves, re-renders with the adapter mounted, and the
 * consuming hook picks up the now-populated client.
 */
export function loadWsAdapter(): Promise<void> {
  if (inflight) {
    return inflight;
  }

  inflight = import("./core/WsAdapter").then((mod) => {
    cached = mod.WsAdapter;
    for (const subscriber of subscribers) subscriber();
  });

  return inflight;
}

/**
 * Signal context: set to `true` by `SchematicProvider` when the consumer
 * passed `ws={null}` (UI-only mode). Read by the client-returning core hooks
 * so they can throw a clear, non-suspending error instead of throwing a load
 * promise that the provider would never recover from (an infinite Suspense
 * loop, since opting out disables the lazy-mount path that resolves the
 * suspended render).
 *
 * Defaulted to `false` so descendants outside any `SchematicProvider` get the
 * normal Suspense-throw behavior (which itself surfaces as an unhandled
 * promise in dev — a clearer failure than a silent loop).
 */
export const SchematicWsDisabledContext = createContext(false);
