// `@schematichq/schematic-react/components` — UI surface.
//
// Re-exports the public surface from the root entry (hooks, context, types),
// shadows `SchematicProvider` with a wrapper that auto-binds the WS and
// embed adapters, and layers on the UI components + embed hooks.
//
// Importing from here pulls in the UI peer deps (Stripe, styled-components,
// i18next). Use the root entry if you only need flags/entitlements.

import React from "react";

import { WsAdapter } from "../core/WsAdapter";
import {
  SchematicProvider as BareSchematicProvider,
  type SchematicProviderProps as BareSchematicProviderProps,
} from "../provider";

import { EmbedAdapter } from "./embed/EmbedAdapter";

// Re-export the rest of the root entry surface. We deliberately enumerate
// instead of `export *` because we need to shadow `SchematicProvider` below.
export { SchematicContext, type SchematicContextValue } from "../context";
export type { SchematicAdapter, SchematicProviderProps } from "../provider";
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
} from "../core/hooks";
export {
  RuleType,
  Schematic,
  TrialStatus,
  UsagePeriod,
} from "@schematichq/schematic-js";
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

// /components-only re-exports. `./embed` already re-exports
// `EmbedContextValue` (via EmbedAdapter), so no separate type re-export.
export * from "./embed";
export * from "./components";
export * from "./hooks";

/**
 * `SchematicProvider` from `/components` — same provider as the root entry,
 * with both the WS and embed adapters pre-bound. Users get the full feature
 * set (flag/entitlement hooks AND UI components) without wiring adapters
 * manually.
 *
 * Pass `ws={null}` to opt out of the WS adapter when only the UI surface is
 * needed (e.g. embedding a `PricingTable` without authenticating a websocket
 * connection). Pass `embed={null}` to opt out of the embed adapter — but if
 * you don't need the UI you should probably import from the root entry
 * instead.
 */
const SchematicProvider: React.FC<BareSchematicProviderProps> = ({
  ws,
  embed,
  ...props
}) => (
  <BareSchematicProvider
    ws={ws === undefined ? WsAdapter : ws}
    embed={embed === undefined ? EmbedAdapter : embed}
    {...(props as BareSchematicProviderProps)}
  />
);
SchematicProvider.displayName = "SchematicProvider";

export { SchematicProvider };
