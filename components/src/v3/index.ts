/**
 * `@schematichq/schematic-components/v3` — code-first elements on the
 * catalog API, with the contract, derivations, and data seam they use.
 */

// The contract types, hooks, and providers live in schematic-react; the
// ones an element consumer needs are re-exported here for convenience.
export {
  CatalogDataProvider,
  useCatalog,
  useCompany,
  useCreditBalances,
  useFeatureUsage,
  useInvalidateCatalog,
  useInvoices,
  useSchematicLocale,
  useUpcomingInvoice,
  type AnyCatalog,
  type Catalog,
  type CatalogData,
  type CatalogDataProviderProps,
  type CatalogDataStatus,
  type CatalogPlan,
  type CompanyCatalog,
  type CompanyCatalogPlan,
  type CompanyContext,
  type CreditBalanceEntry,
  type CreditBundle,
  type Entitlement,
  type FeatureUsageRow,
  type Invoice,
  type InvoicePage,
  type Price,
  type ResourceHandle,
  type ResourceState,
  type Subscription,
  type UpcomingInvoice,
} from "@schematichq/schematic-react";
export * from "./model";
export * from "./styles";
export {
  PricingTable,
  type PlanSelection,
  type PricingTableProps,
} from "./elements/PricingTable";
export {
  IncludedFeatures,
  type IncludedFeaturesProps,
} from "./elements/IncludedFeatures";
export {
  MeteredFeatures,
  type MeteredFeaturesProps,
} from "./elements/MeteredFeatures";
export { PlanManager, type PlanManagerProps } from "./elements/PlanManager";
export { CreditUsage, type CreditUsageProps } from "./elements/CreditUsage";
export { Invoices, type InvoicesProps } from "./elements/Invoices";
export { UpcomingBill, type UpcomingBillProps } from "./elements/UpcomingBill";
export type { ElementProps } from "./elements/common";
