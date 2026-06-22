import {
  useSchematic,
  SchematicProvider,
  type SchematicProviderProps,
} from "./context";
import {
  useSchematicContext,
  useSchematicCreditBalance,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  type SchematicCreditBalance,
  type SchematicHookOpts,
  type UseSchematicPlanOpts,
  type UseSchematicFlagOpts,
} from "./hooks";

export {
  useSchematic,
  useSchematicContext,
  useSchematicCreditBalance,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  SchematicProvider,
};

export type {
  SchematicCreditBalance,
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
  CompanyCreditBalance,
  CreditBalance,
  CreditBalances,
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
