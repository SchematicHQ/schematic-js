// Path C — Suspense-throw activation for the embed adapter.
//
// Lets consumers reach the embed UI (PricingTable, etc.) without paying
// for the embed surface up front: the embed hooks throw the import
// promise, Suspense catches it, and the bare provider — which subscribes
// here via `useSyncExternalStore` — re-renders with the dynamically-loaded
// adapter mounted. Neither entry's `SchematicProvider` wrapper pre-binds
// `embed`, so this is the path that runs by default; pass
// `embed={EmbedAdapter}` to opt into eager mounting instead.
//
// The dynamic `import()` is the seam that lets esbuild emit the embed
// adapter as a separate chunk (with --splitting). In CJS builds it inlines
// instead, which is unavoidable without a separate runtime resolution
// strategy; see `scripts/check-tree-shake.mjs` for the policy.

import { createContext } from "react";

import type { SchematicAdapter } from "./provider";

type Subscriber = () => void;

let cached: SchematicAdapter | null = null;
let inflight: Promise<void> | null = null;
const subscribers = new Set<Subscriber>();

export function getCachedEmbedAdapter(): SchematicAdapter | null {
  return cached;
}

export function subscribeEmbedAdapter(subscriber: Subscriber): () => void {
  subscribers.add(subscriber);
  return () => {
    subscribers.delete(subscriber);
  };
}

/**
 * Kicks off the embed adapter import (idempotent — subsequent calls return
 * the same in-flight promise). Throw the returned promise from a hook to
 * trigger React Suspense; the bare provider's `useSyncExternalStore` will
 * fire once the import resolves, re-render with the adapter mounted, and
 * the suspended descendant retries inside the new context.
 */
export function loadEmbedAdapter(): Promise<void> {
  if (inflight) return inflight;
  inflight = import("./components/embed/EmbedAdapter").then((mod) => {
    cached = mod.EmbedAdapter;
    for (const subscriber of subscribers) subscriber();
  });
  return inflight;
}

/**
 * Signal context: set to `true` by `SchematicProvider` when the consumer
 * passed `embed={null}`. Read by `useEmbed` so it can throw a clear,
 * non-suspending error instead of throwing a load promise that the provider
 * would never recover from (an infinite Suspense loop, since opting out
 * disables the lazy-mount path that resolves the suspended render).
 *
 * Defaulted to `false` so descendants outside any `SchematicProvider` get
 * the normal Suspense-throw behavior (which itself surfaces as an
 * unhandled promise in dev — a clearer failure than a silent loop).
 */
export const SchematicEmbedDisabledContext = createContext(false);
