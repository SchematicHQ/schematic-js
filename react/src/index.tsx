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
import React from "react";

import type { ConfigurationParameters } from "./components/api/checkoutexternal";
import type { EmbedSettings } from "./components/embed/embedState";
import type { DeepPartial } from "./components/types/util";
import { WsAdapter, type WsAdapterProps } from "./core/WsAdapter";
import {
  SchematicProvider as BareSchematicProvider,
  type SchematicAdapter,
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
 * `SchematicProvider` — pre-binds the WS adapter so flag/entitlement hooks
 * work out of the box. Accepts exactly one of `client`, `publishableKey`,
 * or `ws={null}` (UI-only mode). Pass `ws={null}` to opt out of the WS
 * adapter — typically when only using UI components from `/components`.
 */
const SchematicProvider: React.FC<SchematicProviderProps> = (props) => {
  const { ws } = props;

  return (
    <BareSchematicProvider
      {...(props as unknown as SchematicProviderBaseProps)}
      ws={ws === undefined ? WsAdapter : ws}
    />
  );
};

SchematicProvider.displayName = "SchematicProvider";

export { SchematicProvider, WsAdapter, type WsAdapterProps };
