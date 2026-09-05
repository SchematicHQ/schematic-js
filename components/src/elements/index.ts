/**
 * `@schematichq/schematic-components/elements` — code-first elements on the
 * company API, with the contract, derivations, and data seam they use.
 * This release carries the Invoices element; the other elements land with
 * the endpoints that feed them.
 */

// The contract types, hooks, and providers live in schematic-react; the
// ones an element consumer needs are re-exported here for convenience.
// `Translate` comes through ./strings, which is where the key contract is.
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
export * from "./model";
export * from "./strings";
export * from "./styles";
export { Invoices, type InvoicesProps } from "./Invoices";
// The locale and copy an element would resolve, for a host rendering its own
// markup over the hooks and wanting the two to agree.
export {
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
