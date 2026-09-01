export * from "./contract";
export {
  INVOICE_PAGE_SIZE,
  SchematicApiError,
  SchematicCompanyClient,
  fetchCompanyData,
  type AccessToken,
  type AccessTokenProvider,
  type CompanyClient,
  type CompanyClientOptions,
  type InvoicesRequest,
} from "./client";
// The generated wire models (FromJSON/ToJSON and friends), namespaced so
// consumers reference them as companyApi.* without polluting the root.
export * as companyApi from "./api/company/models";
