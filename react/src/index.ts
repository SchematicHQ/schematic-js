import {
  useSchematic,
  SchematicProvider,
  type SchematicProviderProps,
} from "./context";
import {
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicFlagCheck,
  useSchematicIsPending,
  type SchematicHookOpts,
  type UseSchematicFlagOpts,
} from "./hooks";

export {
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicFlagCheck,
  useSchematicIsPending,
  SchematicProvider,
};

export type { SchematicHookOpts, SchematicProviderProps, UseSchematicFlagOpts };

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
  Traits,
} from "@schematichq/schematic-js";
