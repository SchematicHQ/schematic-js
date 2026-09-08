export * from "./contract";
export {
  INVOICE_MAX_PAGE_SIZE,
  INVOICE_PAGE_SIZE,
  SchematicApiError,
  SchematicCompanyClient,
  fetchCompanyData,
  type AccessToken,
  type AccessTokenProvider,
  type CompanyClient,
  type CompanyClientOptions,
  type CompanyPrefetchOptions,
  type CompanySession,
  type InvoicesRequest,
  type InvoicesResult,
  type SessionEvent,
  type SessionInput,
  type SessionStatus,
} from "./client";
// The generated wire models (FromJSON/ToJSON and friends), namespaced so
// consumers reference them as companyApi.* without polluting the root.
export * as companyApi from "./api/company/models";
