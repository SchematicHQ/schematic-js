import {
  useSchematic,
  SchematicProvider,
  type SchematicProviderProps,
} from "./context";
import {
  useSchematicApi,
  useSchematicContext,
  useSchematicCreditBalance,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicInvalidate,
  useSchematicIsPending,
  useSchematicPlan,
  useSchematicQuery,
  type SchematicCreditBalance,
  type SchematicHookOpts,
  type UseSchematicPlanOpts,
  type UseSchematicFlagOpts,
  type UseSchematicQueryOpts,
  type UseSchematicQueryResult,
} from "./hooks";

export {
  useSchematic,
  useSchematicApi,
  useSchematicContext,
  useSchematicCreditBalance,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicInvalidate,
  useSchematicIsPending,
  useSchematicPlan,
  useSchematicQuery,
  SchematicProvider,
};

export type {
  SchematicCreditBalance,
  SchematicHookOpts,
  SchematicProviderProps,
  UseSchematicFlagOpts,
  UseSchematicPlanOpts,
  UseSchematicQueryOpts,
  UseSchematicQueryResult,
};

export {
  checkoutexternal,
  componentspublic,
  createSchematicApi,
  QueryStore,
  RuleType,
  Schematic,
  TokenManager,
  TrialStatus,
  UsagePeriod,
} from "@schematichq/schematic-js";

export type {
  AccessTokenDetails,
  AccessTokenInput,
  AccessTokenResolver,
  FetchQueryOptions,
  QueryState,
  QueryStatus,
  SchematicApi,
  SchematicApiConfig,
  SchematicApiOptions,
  SchematicPublicApi,
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
