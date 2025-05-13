import { isCheckoutData } from "../utils";

import { useEmbed } from ".";

export function useTrialEnd() {
  const { data } = useEmbed();

  const billingSubscription = isCheckoutData(data)
    ? data.company?.billingSubscription
    : undefined;
  const trialEndDate =
    billingSubscription?.trialEnd &&
    new Date(billingSubscription.trialEnd * 1000);

  if (trialEndDate) {
    const todayDate = new Date();
    const trialEndDays = Math.floor(
      (trialEndDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
    );

    return trialEndDays;
  }
}
