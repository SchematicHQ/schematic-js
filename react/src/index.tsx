// `@schematichq/schematic-react` — root entry / WS core surface.
//
// Re-exports the bare provider with the WS adapter pre-bound, the core
// flag/entitlement hooks, the shared `SchematicContext`, and SchematicJS
// re-exports. Importing from here pulls in `@schematichq/schematic-js`
// (peer dep) plus React; no UI deps.

import React from "react";

import { WsAdapter } from "./core/WsAdapter";
import {
  SchematicProvider as BareSchematicProvider,
  type SchematicProviderProps as BareSchematicProviderProps,
} from "./provider";

export { SchematicContext, type SchematicContextValue } from "./context";
export type { SchematicAdapter, SchematicProviderProps } from "./provider";

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

/**
 * `SchematicProvider` — pre-binds the WS adapter so flag/entitlement hooks
 * work out of the box. Same prop surface as the original `react/` package
 * plus the new `ws` slot (defaults to `WsAdapter`; pass `ws={null}` to opt
 * out, e.g. when only using UI components from `/components`).
 */
const SchematicProvider: React.FC<BareSchematicProviderProps> = ({
  ws,
  ...props
}) => (
  <BareSchematicProvider
    ws={ws === undefined ? WsAdapter : ws}
    {...(props as BareSchematicProviderProps)}
  />
);
SchematicProvider.displayName = "SchematicProvider";

export { SchematicProvider };
