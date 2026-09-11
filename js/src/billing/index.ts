export * from "./contract";
export {
  INVOICE_MAX_PAGE_SIZE,
  INVOICE_PAGE_SIZE,
  SchematicBillingClient,
  fetchBillingData,
  type BillingClient,
  type BillingClientOptions,
  type BillingPrefetchOptions,
  type InvoicesRequest,
  type InvoicesResult,
} from "./client";
export {
  SchematicApiError,
  SchematicSession,
  TOKEN_CACHE_SIZE,
  sessionKey,
  type AccessToken,
  type AccessTokenProvider,
  type AccessTokenResult,
  type RequestOptions,
  type Session,
  type SessionEvent,
  type SessionInput,
  type SessionOptions,
  type SessionStatus,
} from "./session";
// The generated wire models are deliberately not re-exported. A namespace
// object holds every member, so bundlers cannot drop any of it: exporting
// them put every invoice codec in the bundle of an app that only reads
// flags. The decoded types reach consumers through ./contract, which is
// what they actually want; anything needing a raw codec can reach into
// ./api/generated/models directly.
