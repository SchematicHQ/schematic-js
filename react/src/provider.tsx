import type * as SchematicJS from "@schematichq/schematic-js";
import React, { Suspense, createElement, useSyncExternalStore } from "react";

import { getCachedEmbedAdapter, subscribeEmbedAdapter } from "./embed-loader";

type CoreOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
>;

/**
 * Loose prop shape for plugin adapters. The bare provider passes all of its
 * props through to each mounted adapter; each adapter destructures what it
 * needs. Types are deliberately loose here so `src/provider.tsx` pulls in
 * zero adapter-side dependencies — the typed wrappers in
 * `@schematichq/schematic-react` (/core) and
 * `@schematichq/schematic-react/components` sharpen them at the boundary.
 */
interface AdapterProps {
  // WS-side
  publishableKey?: string;
  client?: SchematicJS.Schematic;
  // Embed-side
  apiConfig?: unknown;
  settings?: unknown;
  debug?: boolean;
  currencyFilter?: string[];
}

/**
 * A `SchematicProvider` plugin adapter. Wraps `children` and re-provides
 * `SchematicContext` with the slot it owns (WS `client`, or embed surface).
 *
 * Two implementations ship with this package:
 *   * `WsAdapter` — `@schematichq/schematic-react/core` (auto-bound via the
 *     root entry's `SchematicProvider`)
 *   * `EmbedAdapter` — `@schematichq/schematic-react/components` (auto-bound
 *     via that entry's `SchematicProvider`)
 *
 * You can also write your own — anything that satisfies this shape works.
 */
export type SchematicAdapter = React.ComponentType<
  AdapterProps & { children?: React.ReactNode }
>;

/**
 * Props accepted by `SchematicProvider`. The shape is intentionally flat
 * (no discriminated union on `ws` vs `client`/`publishableKey`) so the
 * wrapper functions in /core and /components can forward the `ws` slot
 * cleanly. Combinations the runtime expects:
 *
 *   * WS active (default): pass `publishableKey` xor `client`.
 *   * WS disabled: pass `ws={null}`. `publishableKey` and `client` are
 *     ignored. UI surface still works if the `embed` slot is bound.
 *
 * If WS is active but neither `publishableKey` nor `client` is provided,
 * `WsAdapter` throws at construction with a clear error message.
 */
export type SchematicProviderProps = {
  children: React.ReactNode;
  ws?: SchematicAdapter | null;
  embed?: SchematicAdapter | null;
  /**
   * Rendered while the embed adapter chunk (or any descendant suspending
   * via `useEmbed`) is loading. Defaults to `null`. Wrap individual children
   * in their own `<Suspense>` boundaries for finer-grained fallbacks.
   */
  fallback?: React.ReactNode;
  publishableKey?: string;
  client?: SchematicJS.Schematic;
  apiConfig?: unknown;
  settings?: unknown;
  debug?: boolean;
  currencyFilter?: string[];
} & CoreOptions;

/**
 * The bare Schematic provider — a pure plugin host. Composes the `ws` and
 * `embed` adapter slots (each optional) around `children` and forwards
 * every other prop to both adapters. Each adapter destructures what it
 * needs and ignores the rest.
 *
 * The /core and /components subpath entries each export a thin wrapper
 * named `SchematicProvider` that pre-binds the appropriate adapters:
 *   * /core: `ws={WsAdapter}` (no eager embed binding)
 *   * /components: `ws={WsAdapter}, embed={EmbedAdapter}` (eager)
 *
 * In both wrappers, pass `ws={null}` to opt out of the WS adapter (UI-only
 * mode), or pass `ws={MyAdapter}` to swap in a custom implementation.
 *
 * Lazy embed loading: when no `embed` adapter is bound (either explicitly
 * `undefined` or via the /core wrapper), descendants that call `useEmbed`
 * (and the embed-specific hooks built on it) throw the embed adapter's
 * import promise. The Suspense boundary below catches it; the provider
 * subscribes to `embed-loader` via `useSyncExternalStore` and re-renders
 * with the dynamically-loaded adapter mounted. Pass `embed={null}` to
 * explicitly disable this behavior.
 */
export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  ws: Ws,
  embed: ExplicitEmbed,
  fallback,
  ...props
}) => {
  // When no explicit embed adapter is bound, watch the module-level loader
  // so the provider re-renders the moment a lazy-loaded adapter is ready.
  // Returning `null` for the SSR snapshot keeps server rendering unchanged.
  const LazyLoadedEmbed = useSyncExternalStore(
    subscribeEmbedAdapter,
    getCachedEmbedAdapter,
    () => null,
  );

  // `ExplicitEmbed === null` is an explicit opt-out; only fall back to the
  // lazy-loaded adapter when the prop is `undefined`. We use
  // `React.createElement` rather than JSX for the dynamic mounts so the
  // `react-hooks/static-components` lint doesn't false-positive on these
  // capitalized but locally-resolved component references.
  const Embed: SchematicAdapter | null =
    ExplicitEmbed === undefined ? LazyLoadedEmbed : ExplicitEmbed;

  let tree: React.ReactNode = children;
  if (Embed) {
    tree = createElement(Embed, props, tree);
  }
  if (Ws) {
    tree = createElement(Ws, props, tree);
  }
  return <Suspense fallback={fallback ?? null}>{tree}</Suspense>;
};
