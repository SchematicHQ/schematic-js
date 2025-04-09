import { type SelectedPlan } from "../hooks";

export const getAddOnPrice = (addOn: SelectedPlan, period: string) => {
  if (addOn.chargeType === ChargeType.oneTime) {
    return addOn.oneTimePrice;
  } else if (period == "month") {
    return addOn.monthlyPrice;
  } else {
    return addOn.yearlyPrice;
  }
};

export const ChargeType = {
  oneTime: "one_time",
  recurring: "recurring",
  free: "free",
};
