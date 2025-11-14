import {
  useSchematic,
  SchematicPlugin,
  type SchematicPluginOptions,
  type SchematicContextValue,
} from "./context";
import {
  useSchematicClient,
  useSchematicContext,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  type SchematicComposableOpts,
  type UseSchematicFlagOpts,
} from "./composables";

export {
  useSchematic,
  useSchematicClient,
  useSchematicContext,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  SchematicPlugin,
};

export type {
  SchematicComposableOpts,
  SchematicPluginOptions,
  SchematicContextValue,
  UseSchematicFlagOpts,
};

// Re-export types and classes from schematic-js
export { RuleType, Schematic, UsagePeriod } from "@schematichq/schematic-js";

export type {
  CheckFlagReturn,
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
