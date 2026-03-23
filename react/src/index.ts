import { SchematicProvider, type SchematicProviderProps } from "./context";
import {
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
} from "./hooks";

export {
  useSchematic,
  useSchematicContext,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  SchematicProvider,
};

export type {
  SchematicHookOpts,
  SchematicProviderProps,
  UseSchematicFlagOpts,
  UseSchematicPlanOpts,
};

export { RuleType, Schematic, UsagePeriod } from "@schematichq/schematic-js";

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
