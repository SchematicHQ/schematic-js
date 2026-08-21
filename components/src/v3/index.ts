/**
 * The v3 elements: code-first components over the catalog API, rendered
 * from @schematichq/schematic-react's customer hooks and domain-model
 * derivations. Mount them inside a SchematicProvider configured with a
 * publishableKey (pricing table) and/or an accessToken (everything else),
 * and render <SchematicStyles /> once — or bring your own stylesheet.
 *
 * The legacy embed surface (SchematicEmbed, EmbedProvider) is untouched
 * and continues to run on /components/hydrate.
 */
export { CreditUsage, type CreditUsageProps } from "./CreditUsage";
export {
  IncludedFeatures,
  type IncludedFeaturesProps,
} from "./IncludedFeatures";
export { Invoices, type InvoicesProps } from "./Invoices";
export {
  Meter,
  MeteredFeatures,
  type MeteredFeaturesProps,
} from "./MeteredFeatures";
export { PlanManager, type PlanManagerProps } from "./PlanManager";
export {
  EntitlementRow,
  PlanCard,
  PricingTable,
  type PricingTableProps,
} from "./PricingTable";
export { UpcomingBill, type UpcomingBillProps } from "./UpcomingBill";
export { SchematicStyles, schematicStylesCss } from "./styles";

export {
  SchematicProvider,
  useCatalog,
  useCompany,
  useCreditBalances,
  useFeatureUsage,
  useInvoices,
  useSchematicCustomerClient,
  useSchematicLocale,
  useUpcomingInvoice,
} from "@schematichq/schematic-react";
