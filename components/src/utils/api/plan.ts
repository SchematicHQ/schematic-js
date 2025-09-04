import { type CompanyPlanDetailResponseData } from "../../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../../api/componentspublic";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../const";
import type { Plan } from "../../types";

export function isHydratedPlan(
  plan?: Plan,
): plan is CompanyPlanDetailResponseData {
  return typeof plan !== "undefined" && "current" in plan;
}

export function entitlementCountsReducer(
  acc: Record<
    string,
    | {
        size: number;
        limit: number;
      }
    | undefined
  >,
  plan: PlanViewPublicResponseData | CompanyPlanDetailResponseData,
) {
  acc[plan.id] = {
    size: plan.entitlements.length,
    limit: VISIBLE_ENTITLEMENT_COUNT,
  };

  return acc;
}
