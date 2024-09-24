import {
  useSchematic,
  SchematicProvider,
  type SchematicProviderProps,
} from "./context";
import {
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  type SchematicHookOpts,
  type UseSchematicFlagOpts,
} from "./hooks";

export {
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  SchematicProvider,
};

export type { SchematicHookOpts, SchematicProviderProps, UseSchematicFlagOpts };

export { Schematic } from "@schematichq/schematic-js";

export type {
  Event,
  EventBody,
  EventBodyIdentify,
  EventBodyTrack,
  EventType,
  FlagCheckResponseBody,
  FlagCheckWithKeyResponseBody,
  Keys,
  SchematicContext,
  SchematicOptions,
  Traits,
} from "@schematichq/schematic-js";
