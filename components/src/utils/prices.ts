import { type SelectedPlan } from "../hooks";

export const getAddOnPrice = (addOn: SelectedPlan, period: string) => {
  if (addOn.chargeType === "one-time") {
    return addOn.oneTimePrice;
  } else if (period == "month") {
    return addOn.monthlyPrice;
  } else {
    return addOn.yearlyPrice;
  }
};
