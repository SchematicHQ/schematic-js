/**
 * The billing contract lives in schematic-js. This package serves the slice
 * of it that has hooks here, and names that slice below rather than taking
 * the whole contract: schematic-js may already describe a resource or a
 * client method this release does not read, and typing the store by the
 * whole would make each addition there a compile error here, so that taking
 * a newer schematic-js meant adopting whatever it added. A resource joins
 * this list with the hook that reads it. The catalog, invoices,
 * upcoming-invoice, payment-methods, feature-usage, credits and company
 * slices so far; the rest of the contract ships with its elements.
 */
import {
  normalizeCatalogQuery as normalizeCatalog,
  normalizeInvoiceQuery as normalize,
} from "@schematichq/schematic-js";

import type {
  BillingClient as ContractClient,
  BillingResourceParams as ContractResourceParams,
  BillingResources as ContractResources,
  CatalogQuery,
  InvoiceQuery,
} from "@schematichq/schematic-js";

export {
  CheckoutDraft,
  CheckoutProblemCode,
  CheckoutStatus,
  checkoutProblemsOf,
  DEFAULT_CATALOG_QUERY,
  DEFAULT_INVOICE_QUERY,
  InvoiceStatus,
  SINGLETON,
  type BillingData,
  type Catalog,
  type CatalogAutoTopup,
  type CatalogCheckoutField,
  type CatalogCreditBundle,
  type CatalogEntitlement,
  type CatalogPlan,
  type CatalogQuery,
  type Checkout,
  type CheckoutDraftState,
  type CheckoutPriceSnapshot,
  type CheckoutProblem,
  type CheckoutResult,
  type CheckoutSelections,
  type CheckoutTransport,
  type CheckoutWrite,
  type Company,
  type CompanyPlan,
  type CompanySubscription,
  type CreditAutoTopup,
  type CreditBalanceEntry,
  type CreditComposition,
  type CreditGrant,
  type CreditUserUsage,
  type CreditUserUsageRow,
  type CustomPlanBilling,
  type FeatureUsage,
  type FeatureUserUsage,
  type Invoice,
  type InvoicePage,
  type Discount,
  type InvoiceQuery,
  type MeteredPrice,
  type PaymentMethod,
  type PerLicenseCreditGrant,
  type ResourceState,
  type ScheduledDowngrade,
  type SetupIntent,
  type UpcomingInvoice,
  type UserUsage,
} from "@schematichq/schematic-js";

/** The resources this package serves; a key of schematic-js's contract. */
export type BillingResourceName =
  | "catalog"
  | "invoices"
  | "upcomingInvoice"
  | "paymentMethods"
  | "featureUsage"
  | "creditBalances"
  | "company";
export type BillingResources = Pick<ContractResources, BillingResourceName>;
export type BillingResourceParams = Pick<
  ContractResourceParams,
  BillingResourceName
>;

/**
 * What `BillingProvider` asks of its client: the session it reads under, the
 * fetch behind each resource above, and the payment-method and checkout
 * actions the hooks expose. schematic-js's `SchematicBillingClient`
 * satisfies it, and so does a host's own client that implements only this
 * much. Named apart from schematic-js's `BillingClient`, which is the whole
 * interface; this is the part the hooks here call.
 */
export type BillingProviderClient = Pick<
  ContractClient,
  | "sessionStatus"
  | "sessionKey"
  | "setSession"
  | "onSessionChange"
  | "fetchCatalog"
  | "createCheckout"
  | "getCheckout"
  | "updateCheckout"
  | "finalizeCheckout"
  | "fetchInvoices"
  | "fetchUpcomingInvoice"
  | "fetchPaymentMethods"
  | "createSetupIntent"
  | "updatePaymentMethod"
  | "deletePaymentMethod"
  | "fetchFeatureUsage"
  | "fetchFeatureUserUsage"
  | "fetchCreditBalances"
  | "fetchCreditUserUsage"
  | "fetchCompany"
>;

/**
 * Keeps only the fields the request reads. The store keys a row set by the
 * query's shape, so a field the API never sees would key a row set of its
 * own, and a varying one a row set per render. schematic-js's normalizer
 * passes unknown fields through; this export shadows it on purpose.
 */
export function normalizeInvoiceQuery(query: InvoiceQuery): InvoiceQuery {
  return normalize(query).includePending === true
    ? { includePending: true }
    : {};
}

/** As `normalizeInvoiceQuery`: only the catalog id keys a catalog. */
export function normalizeCatalogQuery(query: CatalogQuery): CatalogQuery {
  const { catalogId } = normalizeCatalog(query);
  return catalogId === undefined ? {} : { catalogId };
}
