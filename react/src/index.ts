import {
  useSchematic,
  SchematicProvider,
  type SchematicProviderProps,
} from "./context";
import {
  useSchematicContext,
  useSchematicCreditBalance,
  useSchematicCreditSpendPolicies,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  type SchematicCreditBalance,
  type SchematicCreditSpendPolicies,
  type SchematicHookOpts,
  type UseSchematicPlanOpts,
  type UseSchematicFlagOpts,
} from "./hooks";

export {
  useSchematic,
  useSchematicContext,
  useSchematicCreditBalance,
  useSchematicCreditSpendPolicies,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  SchematicProvider,
};

export type {
  SchematicCreditBalance,
  SchematicCreditSpendPolicies,
  SchematicHookOpts,
  SchematicProviderProps,
  UseSchematicFlagOpts,
  UseSchematicPlanOpts,
};

export * from "./billing";
export * from "./i18n";

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
  CreditSpendPolicies,
  CreditSpendPolicy,
  CreditSpendPolicyKind,
  CreditSpendPolicyScope,
  CreditSpendWindow,
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
  WarningTier,
} from "@schematichq/schematic-js";
