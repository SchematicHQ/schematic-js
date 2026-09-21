// The resource unions (`BillingResourceName` and the maps keyed by it) stay
// internal: they say which slice of schematic-js's contract this package
// serves, and a host reads that through the hooks rather than the type.
export {
  DEFAULT_INVOICE_QUERY,
  InvoiceStatus,
  normalizeInvoiceQuery,
  type BillingData,
  type BillingProviderClient,
  type Invoice,
  type InvoicePage,
  type InvoiceQuery,
  type ResourceState,
} from "./contract";
export {
  INVOICE_PAGE_SIZE,
  type AccessToken,
  type AccessTokenProvider,
  type Session,
  type SessionEvent,
  type SessionInput,
  type SessionStatus,
} from "./client";
export {
  BillingDataProvider,
  useBillingDataSource,
  type BillingDataProviderProps,
  type BillingDataSource,
  type BillingDataStatus,
  type ResourceHandle,
} from "./context";
export {
  useInvalidateBillingData,
  useInvoices,
  type InvoicesHandle,
} from "./hooks";
export { BillingProvider, type BillingProviderProps } from "./provider";
// `Resource`, `KeyedResource`, `BillingStore` and `BillingDataContext` stay
// internal on purpose: what a package exports it owns, and these are a
// generic store rather than billing surface. The hooks are the contract, so
// these stay free to change behind them.
