// Everything the contract module names: the resources this package serves,
// the client shape the provider needs, and the js types they are built from.
// `BillingDataSource` and `BillingDataStatus` are generic over the resource
// union, so a host implementing either has to be able to name it.
export * from "./contract";
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
  useUpcomingInvoice,
  type InvoicesHandle,
} from "./hooks";
export { BillingProvider, type BillingProviderProps } from "./provider";
// `Resource`, `KeyedResource`, `BillingStore` and `BillingDataContext` stay
// internal on purpose: what a package exports it owns, and these are a
// generic store rather than billing surface. The hooks are the contract, so
// these stay free to change behind them.
