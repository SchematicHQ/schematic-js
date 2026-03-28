import { type CompanyPlanDetailResponseData } from "../../api/checkoutexternal";
import { type PlanViewPublicResponseData } from "../../api/componentspublic";
import { VISIBLE_ENTITLEMENT_COUNT } from "../../const";

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

export function getSelectedPlan(
  plans: CompanyPlanDetailResponseData[],
  id?: string | null,
) {
  const match = plans.find(
    (plan) =>
      (id ? plan.id === id : plan.current) &&
      // do not consider a trial
      (!plan.isTrialable || !plan.companyCanTrial),
  );

  return match;
}

export function isAddOnSelected(
  addOn: CompanyPlanDetailResponseData,
  ids?: string[],
) {
  return (
    (ids ? ids.includes(addOn.id) : addOn.current) &&
    // do not consider a trial
    (!addOn.isTrialable || !addOn.companyCanTrial)
  );
}

export function getSelectedAddOns(
  addOns: CompanyPlanDetailResponseData[],
  ids?: string[],
) {
  const matches = addOns.filter((addOn) => isAddOnSelected(addOn, ids));

  return matches;
}
