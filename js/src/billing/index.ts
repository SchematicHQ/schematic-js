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
// The generated wire models (FromJSON/ToJSON and friends), namespaced so
// consumers reference them as billingApi.* without polluting the root.
export * as billingApi from "./api/generated/models";
