import { SchematicProvider, SchematicProviderProps } from "./context";
import {
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
  UseSchematicFlagOpts,
  SchematicHookOpts,
} from "./hooks";

export { Embed } from "./components";

export {
  SchematicProvider,
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
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
  SchematicOptions,
  SchematicContext,
  Traits,
} from "@schematichq/schematic-js";
