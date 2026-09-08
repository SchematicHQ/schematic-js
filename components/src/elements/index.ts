/**
 * `@schematichq/schematic-components/elements` — code-first elements on the
 * company API, with the contract, derivations, and data seam they use.
 * This release carries the Invoices element; the other elements land with
 * the endpoints that feed them.
 */

export {
  CompanyDataProvider,
  SchematicI18nProvider,
  useInvalidateCompanyData,
  useInvoices,
  useSchematicI18n,
  useSchematicLocale,
  useSchematicStrings,
  useSchematicTranslate,
  type CompanyData,
  type CompanyDataProviderProps,
  type CompanyDataStatus,
  type Invoice,
  type InvoicePage,
  type InvoiceQuery,
  type ResourceHandle,
  type ResourceState,
  type SchematicI18nConfig,
  type SchematicI18nProviderProps,
} from "@schematichq/schematic-react";
export {
  deriveInvoiceList,
  featureName,
  formatConsumptionRate,
  formatCurrency,
  formatDate,
  formatNumber,
  formatShortDate,
  plural,
  resolveLocale,
  viewerLocale,
  type DeriveInvoiceListOptions,
  type FormatCurrencyOptions,
  type InvoiceFormatters,
  type InvoiceList,
  type InvoiceRow,
} from "./model";
export {
  DEFAULT_STRINGS,
  interpolate,
  lookup,
  type ElementStrings,
  type StringCatalog,
  type StringKey,
  type StringOverrides,
  type StringVars,
  type Translate,
  type Translator,
} from "./strings";
export * from "./styles";
export { Invoices, type InvoicesProps } from "./Invoices";
export {
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
