import {
  EmbedContext,
  EmbedProvider,
  SchematicProvider,
  type EmbedContextProps,
  type EmbedProviderProps,
  type SchematicProviderProps,
} from "./context";
import {
  useEmbed,
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
  type UseSchematicFlagOpts,
  type SchematicHookOpts,
} from "./hooks";

export * from "./components";

export {
  EmbedContext,
  EmbedProvider,
  useEmbed,
  SchematicProvider,
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
};

export type {
  EmbedContextProps,
  EmbedProviderProps,
  SchematicHookOpts,
  SchematicProviderProps,
  UseSchematicFlagOpts,
};

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
