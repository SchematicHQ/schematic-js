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

// Customer data hooks for catalog-API consumer surfaces (pricing tables,
// plan managers, usage meters). See hooks/customer.ts.
export {
  useCatalog,
  useCompany,
  useCreditBalances,
  useFeatureUsage,
  useInvoices,
  useSchematicCustomerClient,
  useSchematicLocale,
  type UseInvoicesResult,
  useUpcomingInvoice,
  type UseCustomerResourceOpts,
  type UseCustomerResourceResult,
} from "./hooks";

export {
  deriveCreditBalances,
  derivePeriod,
  PricePeriod,
  deriveEntitlement,
  deriveInvoiceList,
  derivePlanSummary,
  derivePriceDisplay,
  derivePlanOfferings,
  fetchCatalog,
  fetchCompany,
  fetchCreditBalances,
  fetchFeatureUsage,
  fetchInvoices,
  fetchUpcomingInvoice,
  type CatalogMode,
  type CatalogParams,
  type CustomerInitialData,
  type DisplayToggles,
  type InvoicePage,
  type PlanSummaryInput,
  deriveUpcomingInvoice,
  deriveUsage,
  SchematicCustomerClient,
} from "@schematichq/schematic-js";

export type {
  AccessTokenInput,
  CreditBalanceSummary,
  CreditBundleOffering,
  CustomerCatalog,
  CustomPlanCta,
  EntitlementDisplayOptions,
  EntitlementKind,
  EntitlementSummary,
  InvoiceRow,
  ListInvoicesParams,
  PlanOffering,
  PlanSummaryNotice,
  PlanSummary,
  PlanOfferings,
  SchematicCustomerClientOptions,
  ResourceState,
  UpcomingInvoiceSummary,
  UsageSummary,
} from "@schematichq/schematic-js";
