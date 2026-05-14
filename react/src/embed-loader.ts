// Path C — Suspense-throw activation for the embed adapter.
//
// Allows a /core consumer to use embed UI components (PricingTable, etc.)
// without paying for the embed surface up front: the embed hooks throw the
// import promise, Suspense catches it, and the bare provider — which
// subscribes here via `useSyncExternalStore` — re-renders with the
// dynamically-loaded adapter mounted.
//
// The dynamic `import()` is the seam that lets esbuild emit the embed
// adapter as a separate chunk (with --splitting). In CJS builds it inlines
// instead, which is unavoidable without a separate runtime resolution
// strategy; see `scripts/check-tree-shake.mjs` for the policy.

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
    cached = mod.EmbedAdapter as unknown as SchematicAdapter;
    for (const subscriber of subscribers) subscriber();
  });
  return inflight;
}
