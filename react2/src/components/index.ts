// `@schematichq/schematic-react2/components` — UI surface.
//
// Re-exports the core flag/entitlement hooks AND adds the REST-backed
// embed provider, hooks, and UI components. Importing from here pulls in
// the UI peer dependencies (Stripe, styled-components, i18next). Use the
// root entry (`@schematichq/schematic-react2`) if you only need flags or
// entitlements.

// Core hooks (re-exported so `/components` is a strict superset).
// Note: the core `SchematicProvider` is intentionally NOT re-exported here —
// the unified `SchematicProvider` from `./context` (which composes the core
// provider internally) wins.
export {
  useSchematic,
  useSchematicContext,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
} from "../core";

export type {
  SchematicHookOpts,
  UseSchematicFlagOpts,
  UseSchematicPlanOpts,
} from "../core";

export * from "./components";
export * from "./context";
export * from "./hooks";

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
  SchematicContext,
  SchematicOptions,
  StoragePersister,
  Traits,
} from "@schematichq/schematic-js";
