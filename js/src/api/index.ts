import * as checkoutexternal from "./checkoutexternal";
import * as componentspublic from "./componentspublic";
import * as helpers from "./helpers";

/**
 * The full generated clients (APIs, models, runtime) namespaced per spec, so
 * shared model names cannot collide at the package root; and the display
 * helpers namespaced so view-layer conveniences stay fenced off from the
 * core surface.
 */
export { checkoutexternal, componentspublic, helpers };

// The helper symbols are also exported flat: API Extractor only carries
// declarations through downstream d.ts rollups (e.g. schematic-react's, which
// bundles this package) when they are reachable via an export, and
// namespace-only reachability is not enough. Consumers should prefer the
// `helpers` namespace.
export * from "./helpers";

export * from "./catalog";
export * from "./customerClient";
export * from "./resource";
export * from "./subscription";
export * from "./tokenManager";

// Render-critical generated enums and types, re-exported at the root so
// typical consumers never need the full spec namespaces.
export {
  BillingCreditGrantReason,
  EntitlementPriceBehavior,
  FeatureType,
  InvoiceStatus,
} from "./checkoutexternal";
export type {
  BillingPriceResponseData,
  CompanyDetailResponseData,
  CompanyPlanDetailResponseData,
  CompanySubscriptionResponseData,
  ComponentDisplaySettings,
  ComponentHydrateResponseData,
  CreditCompanyGrantView,
  FeatureResponseData,
  FeatureUsageResponseData,
  InvoiceResponseData,
  PlanDetailResponseData,
  PlanEntitlementResponseData,
  ScheduledDowngradeResponseData,
} from "./checkoutexternal";
export type { PublicPlansResponseData } from "./componentspublic";
