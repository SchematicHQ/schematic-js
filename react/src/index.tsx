// `@schematichq/schematic-react` — root entry / WS core surface.
//
// Re-exports the bare provider with the WS adapter pre-bound, the core
// flag/entitlement hooks, the shared `SchematicContext`, and SchematicJS
// re-exports. Importing from here pulls in `@schematichq/schematic-js`
// (peer dep) plus React; no UI deps.
//
// Note: a few embed-adapter prop *types* below (`ConfigurationParameters`,
// `EmbedSettings`, `DeepPartial`) are pulled in via `import type` from the
// `/components` subtree. These are erased at compile time and have zero
// runtime cost — the values they describe never reach the root bundle. The
// purpose is purely so a single `SchematicProviderProps` type lives at the
// root entry and is re-exported (not duplicated) from `/components`.

import type * as SchematicJS from "@schematichq/schematic-js";
import React, { createElement, lazy } from "react";

import type { ConfigurationParameters } from "./components/api/checkoutexternal";
import type { EmbedSettings } from "./components/embed/embedState";
import type { DeepPartial } from "./components/types/util";
import type { WsAdapterProps } from "./core/WsAdapter";
import {
  SchematicProvider as BareSchematicProvider,
  type SchematicAdapter,
  type SchematicAdapterProps,
  type SchematicProviderBaseProps,
} from "./provider";

export { SchematicContext, type SchematicContextValue } from "./context";
export {
  SchematicProvider as BareSchematicProvider,
  type SchematicAdapter,
  type SchematicAdapterProps,
  type SchematicProviderBaseProps,
} from "./provider";

// Internal embed-loader plumbing — re-exported from the root entry so the
// `/components` bundle can reach the same module instance via a self-package
// import (see `react/src/components/index.tsx`). Sharing the singleton
// `cached` / `subscribers` state across the two bundles is what lets
// Path C (Suspense-throw lazy embed activation) work when consumers mix
// imports from both subpath entries. Not part of the documented public API.
export {
  SchematicEmbedDisabledContext,
  getCachedEmbedAdapter,
  loadEmbedAdapter,
  subscribeEmbedAdapter,
} from "./embed-loader";

// WS adapter lazy-loader plumbing — same singleton-sharing rationale as the
// embed-loader re-exports above. Lets the core hooks (and any /components
// consumer reaching them via the self-package import) trigger the one shared
// WS adapter chunk. Not part of the documented public API.
export {
  SchematicWsDisabledContext,
  getCachedWsAdapter,
  loadWsAdapter,
  subscribeWsAdapter,
} from "./ws-loader";

export { UsageMeter } from "./core/components";
export {
  useSchematic,
  useSchematicContext,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  type SchematicHookOpts,
  type UseSchematicFlagOpts,
  type UseSchematicPlanOpts,
} from "./core/hooks";

export {
  RuleType,
  Schematic,
  TrialStatus,
  UsagePeriod,
} from "@schematichq/schematic-js";

// NOTE: the JS `SchematicContext` type (the user/company context shape) is
// intentionally NOT re-exported — its name now collides with our React
// context. Import it directly from `@schematichq/schematic-js` if needed.
export type {
  CheckFlagReturn,
  CheckPlanReturn,
  Event,
  EventBody,
  EventBodyIdentify,
  EventBodyTrack,
  EventType,
  Keys,
  SchematicOptions,
  StoragePersister,
  Traits,
} from "@schematichq/schematic-js";

type CoreOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
>;

type CommonProviderProps = {
  children: React.ReactNode;
  ws?: SchematicAdapter | null;
  embed?: SchematicAdapter | null;
  fallback?: React.ReactNode;
  /** Only consumed by the embed adapter — has no effect without one bound. */
  apiConfig?: ConfigurationParameters;
  /** Only consumed by the embed adapter — has no effect without one bound. */
  settings?: DeepPartial<EmbedSettings>;
  /** Only consumed by the embed adapter — has no effect without one bound. */
  debug?: boolean;
  /** Only consumed by the embed adapter — has no effect without one bound. */
  currencyFilter?: string[];
} & CoreOptions;

// Restored client xor publishableKey union (lost in the initial unification).
// Plus a `ws: null` variant so consumers can drop the WS adapter entirely.
type WithClient = {
  client: SchematicJS.Schematic;
  publishableKey?: never;
};

type WithPublishableKey = {
  client?: never;
  publishableKey: string;
};

type WithoutWs = {
  client?: never;
  publishableKey?: string;
  ws: null;
};

export type SchematicProviderProps = CommonProviderProps &
  (WithClient | WithPublishableKey | WithoutWs);

/**
 * `SchematicProvider` — flag/entitlement hooks work out of the box: the WS
 * adapter is lazy-loaded the first time a core hook is used (no eager bind, so
 * `@schematichq/schematic-js` stays out of the consumer's main bundle until
 * then). Accepts exactly one of `client`, `publishableKey`, or `ws={null}`
 * (UI-only mode). Pass `ws={null}` to opt out of the WS adapter — typically
 * when only using UI components from `/components` — or `ws={WsAdapter}` to
 * eager-mount it at provider time instead of on first hook use.
 */
const SchematicProvider: React.FC<SchematicProviderProps> = (props) => {
  // Forward `ws` unchanged: `undefined` reaches the bare provider as
  // "lazy-load on first core-hook use", `null` as the explicit opt-out, and an
  // explicit adapter (e.g. `WsAdapter`) as an eager bind.
  return (
    <BareSchematicProvider
      {...(props as unknown as SchematicProviderBaseProps)}
    />
  );
};

SchematicProvider.displayName = "SchematicProvider";

// `WsAdapter` (opt-in eager binding) — a thin function-component wrapper around
// the chunk-split lazy ref, mirroring the `EmbedAdapter` export in
// `src/components/index.tsx`. Importing this symbol does not pull the WS
// adapter (or `@schematichq/schematic-js`'s `new Schematic`) into the eager
// graph; the dynamic-import seam loads it when the element first renders. Pass
// it as `ws={WsAdapter}` to `SchematicProvider` to start that load on provider
// mount instead of on first core-hook use.
const InternalLazyWsAdapter = lazy(() =>
  import("./core/WsAdapter").then((m) => ({ default: m.WsAdapter })),
);

const WsAdapter: SchematicAdapter = (props: SchematicAdapterProps) =>
  createElement(InternalLazyWsAdapter, props);
(WsAdapter as React.FC).displayName = "WsAdapter";

export { SchematicProvider, WsAdapter, type WsAdapterProps };
