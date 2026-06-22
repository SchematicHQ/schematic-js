import {
  useSchematic,
  SchematicPlugin,
  type SchematicPluginOptions,
  type SchematicContextValue,
} from "./context";
import {
  useSchematicClient,
  useSchematicContext,
  useSchematicCreditBalance,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  type CreditBalanceType,
  type SchematicComposableOpts,
  type UseSchematicCreditBalanceOpts,
  type UseSchematicFlagOpts,
  type UseSchematicPlanOpts,
} from "./composables";

export {
  useSchematic,
  useSchematicClient,
  useSchematicContext,
  useSchematicCreditBalance,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  SchematicPlugin,
};

export type {
  CreditBalanceType,
  SchematicComposableOpts,
  SchematicPluginOptions,
  SchematicContextValue,
  UseSchematicCreditBalanceOpts,
  UseSchematicFlagOpts,
  UseSchematicPlanOpts,
};

// Re-export types and classes from schematic-js
export { RuleType, Schematic, UsagePeriod } from "@schematichq/schematic-js";

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
