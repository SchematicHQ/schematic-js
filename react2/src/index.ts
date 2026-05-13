import {
  SchematicProvider,
  useSchematic,
  type SchematicProviderProps,
} from "./core/context";
import {
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
  SchematicProvider,
  useSchematic,
  useSchematicContext,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
};

export type {
  SchematicHookOpts,
  SchematicProviderProps,
  UseSchematicFlagOpts,
  UseSchematicPlanOpts,
};

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
