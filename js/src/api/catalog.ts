import type {
  CompanyPlanDetailResponseData,
  CompatiblePlans,
  ComponentCapabilities,
  ComponentDisplaySettings,
  ComponentHydrateResponseData,
} from "./checkoutexternal";
import type { PublicPlansResponseData } from "./componentspublic";

/**
 * The catalog is served by two endpoints depending on auth:
 * - publishable key -> GET /public/plans (no company context)
 * - temporary access token -> GET /components/hydrate (plans annotated with
 *   company context: current/valid/companyCanTrial/...)
 *
 * Both are normalized to a single Catalog shape; company-context fields are
 * simply absent in public mode.
 */

type CompanyContextField =
  "companyCanTrial" | "current" | "invalidReason" | "usageViolations" | "valid";

export type CatalogPlan = Omit<
  CompanyPlanDetailResponseData,
  CompanyContextField
> &
  Partial<Pick<CompanyPlanDetailResponseData, CompanyContextField>>;

export type CatalogMode = "public" | "company";

export interface Catalog {
  mode: CatalogMode;
  plans: CatalogPlan[];
  addOns: CatalogPlan[];
  addOnCompatibilities: CompatiblePlans[];
  capabilities?: ComponentCapabilities;
  displaySettings: ComponentDisplaySettings;
}

export function toCatalogFromPublic(data: PublicPlansResponseData): Catalog {
  return {
    mode: "public",
    plans: data.activePlans,
    addOns: data.activeAddOns,
    addOnCompatibilities: data.addOnCompatibilities,
    capabilities: data.capabilities,
    displaySettings: data.displaySettings,
  };
}

export function toCatalogFromHydrate(
  data: ComponentHydrateResponseData,
): Catalog {
  return {
    mode: "company",
    plans: data.activePlans,
    addOns: data.activeAddOns,
    addOnCompatibilities: data.addOnCompatibilities,
    capabilities: data.capabilities,
    displaySettings: data.displaySettings,
  };
}
