import type * as SchematicJS from "@schematichq/schematic-js";
import React, { Suspense, createElement, useSyncExternalStore } from "react";

import type { CheckoutPrefill } from "./components/embed/embedState";
import {
  SchematicEmbedDisabledContext,
  getCachedEmbedAdapter,
  subscribeEmbedAdapter,
} from "./embed-loader";
import {
  SchematicWsDisabledContext,
  getCachedWsAdapter,
  subscribeWsAdapter,
} from "./ws-loader";

type CoreOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
>;

/**
 * The full flat prop bag the bare provider hands to each adapter. Types are
 * deliberately loose (`apiConfig`/`settings` as `unknown`) so the bare
 * provider compiles without pulling in any adapter-side dependency. The
 * wrappers in `react/src/index.tsx` and `react/src/components/index.tsx`
 * sharpen these at the public API boundary.
 */
export interface SchematicAdapterProps {
  children?: React.ReactNode;
  publishableKey?: string;
  client?: SchematicJS.Schematic;
  apiConfig?: unknown;
  settings?: unknown;
  debug?: boolean;
  currencyFilter?: string[];
  checkoutPrefill?: CheckoutPrefill;
}

/**
 * A `SchematicProvider` plugin adapter. Wraps `children` and re-provides
 * `SchematicContext` with the slot it owns (WS `client`, or embed surface).
 *
 * Accepts both regular `ComponentType` refs and `React.lazy`-wrapped refs
 * (`ExoticComponent`). The latter is what lets `EmbedAdapter` ship as a
 * chunk-split re-export from `@schematichq/schematic-react/components`
 * without any cast at the consumer boundary.
 */
export type SchematicAdapter =
  | React.ComponentType<SchematicAdapterProps>
  | React.ExoticComponent<SchematicAdapterProps>;

type ForwardableProps = Omit<
  SchematicProviderBaseProps,
  "children" | "ws" | "embed" | "fallback"
>;

/**
 * Base prop shape for the bare provider — accepts any adapter combination.
 * The exported `SchematicProvider` wrappers narrow this with a
 * discriminated union (client xor publishableKey, or `ws={null}`).
 */
export type SchematicProviderBaseProps = {
  children: React.ReactNode;
  ws?: SchematicAdapter | null;
  embed?: SchematicAdapter | null;
  /**
   * Rendered while a lazy adapter chunk is loading. Defaults to `null`.
   * The inner Suspense boundary around `children` uses `null` so a child's
   * `useEmbed` throw doesn't show this fallback for the whole tree —
   * consumers can place finer-grained `<Suspense>` boundaries around any
   * descendant for that.
   */
  fallback?: React.ReactNode;
  publishableKey?: string;
  client?: SchematicJS.Schematic;
  apiConfig?: unknown;
  settings?: unknown;
  debug?: boolean;
  currencyFilter?: string[];
  checkoutPrefill?: CheckoutPrefill;
} & CoreOptions;

// === Per-adapter prop filtering =============================================
//
// The bare provider used to forward every prop to every adapter, which (a)
// let embed-only options like `apiConfig` flow into the WS adapter — and
// from there into `new Schematic(key, {...})` — and (b) handed CoreOptions
// (`additionalHeaders` etc.) to the embed adapter, which ignores them but
// would silently swallow a typo. We now split into two known buckets so
// each adapter only sees props it actually consumes.

function pickWsProps(
  props: ForwardableProps,
): SchematicAdapterProps & CoreOptions {
  const {
    apiConfig: _apiConfig,
    settings: _settings,
    debug: _debug,
    currencyFilter: _currencyFilter,
    checkoutPrefill: _checkoutPrefill,
    ...rest
  } = props;

  return rest;
}

function pickEmbedProps(props: ForwardableProps): SchematicAdapterProps {
  return {
    publishableKey: props.publishableKey,
    apiConfig: props.apiConfig,
    settings: props.settings,
    debug: props.debug,
    currencyFilter: props.currencyFilter,
    checkoutPrefill: props.checkoutPrefill,
  };
}

/**
 * The bare Schematic provider — a pure plugin host. Composes the `ws` and
 * `embed` adapter slots (each optional) around `children`, forwarding only
 * the prop subsets each adapter cares about.
 *
 * Suspense boundaries:
 *   * Outer boundary (uses `fallback`): catches adapter-level lazy throws,
 *     e.g. `embed={EmbedAdapter}` where the export is `React.lazy`-wrapped.
 *   * Inner boundary around `children` (always `null` fallback): isolates
 *     a descendant's `useEmbed` throw from cascading past the consumer's
 *     content. Consumers wanting visible "loading…" UI place their own
 *     `<Suspense>` boundary closer to the affected component.
 *
 * Lazy adapter loading: when an adapter slot is unbound (the prop is
 * `undefined`), descendants that need it trigger its import on first use.
 * For embed, `useEmbed` throws the import promise; for WS, the
 * client-returning core hooks (`useSchematic`, …) throw it while the value
 * hooks (`useSchematicFlag`, …) start the load from an effect and render
 * their fallback meanwhile. The inner Suspense catches any throw; the
 * provider subscribes to `embed-loader` / `ws-loader` via
 * `useSyncExternalStore` and re-renders with the dynamically-loaded adapter
 * mounted. Pass `embed={null}` / `ws={null}` to explicitly disable a slot —
 * the provider then publishes that decision via
 * `SchematicEmbedDisabledContext` / `SchematicWsDisabledContext` so the
 * affected hooks throw a clear error rather than looping on a Suspense
 * throw that no one will resolve.
 */
export const SchematicProvider: React.FC<SchematicProviderBaseProps> = ({
  children,
  ws: ExplicitWs,
  embed: ExplicitEmbed,
  fallback,
  ...props
}) => {
  const LazyLoadedWs = useSyncExternalStore(
    subscribeWsAdapter,
    getCachedWsAdapter,
    () => null,
  );
  const LazyLoadedEmbed = useSyncExternalStore(
    subscribeEmbedAdapter,
    getCachedEmbedAdapter,
    () => null,
  );

  // `ws === null` is an explicit opt-out (UI-only mode). Don't auto-load, and
  // broadcast the decision so the client-returning core hooks throw a clear
  // error instead of looping on a Suspense throw the provider never resolves.
  const wsDisabled = ExplicitWs === null;
  const Ws: SchematicAdapter | null =
    ExplicitWs === undefined ? LazyLoadedWs : ExplicitWs;

  // `embed === null` is an explicit opt-out. Don't auto-load, and broadcast
  // the decision so `useEmbed` throws a clear error instead of looping.
  const embedDisabled = ExplicitEmbed === null;
  const Embed: SchematicAdapter | null =
    ExplicitEmbed === undefined ? LazyLoadedEmbed : ExplicitEmbed;

  // Inner Suspense around children: a child's `useEmbed`/`useSchematic` throw
  // is caught here so it doesn't bubble to the outer fallback, and so the
  // adapter load swap re-renders inside this boundary specifically.
  let tree: React.ReactNode = <Suspense fallback={null}>{children}</Suspense>;

  if (Embed) {
    tree = createElement(
      Embed as React.ComponentType<SchematicAdapterProps>,
      pickEmbedProps(props as ForwardableProps),
      tree,
    );
  }

  if (Ws) {
    tree = createElement(
      Ws as React.ComponentType<SchematicAdapterProps>,
      pickWsProps(props as ForwardableProps),
      tree,
    );
  }

  return (
    <SchematicWsDisabledContext.Provider value={wsDisabled}>
      <SchematicEmbedDisabledContext.Provider value={embedDisabled}>
        <Suspense fallback={fallback ?? null}>{tree}</Suspense>
      </SchematicEmbedDisabledContext.Provider>
    </SchematicWsDisabledContext.Provider>
  );
};
