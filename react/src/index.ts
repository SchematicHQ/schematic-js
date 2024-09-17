import {
  defaultSettings,
  defaultTheme,
  useSchematic,
  EmbedContext,
  EmbedProvider,
  SchematicProvider,
  type EmbedContextProps,
  type EmbedProviderProps,
  type SchematicProviderProps,
} from "./context";
import {
  useEmbed,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  type SchematicHookOpts,
  type UseSchematicFlagOpts,
} from "./hooks";

export * from "./components";

export {
  defaultSettings,
  defaultTheme,
  useEmbed,
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  EmbedContext,
  EmbedProvider,
  SchematicProvider,
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
  SchematicContext,
  SchematicOptions,
  Traits,
} from "@schematichq/schematic-js";
