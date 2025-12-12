import { useMemo } from "react";

import {
  DAYS_IN_MS,
  HOURS_IN_MS,
  MINUTES_IN_MS,
  SECONDS_IN_MS,
} from "../const";
import { pluralize } from "../utils";

import { useEmbed } from ".";

export function useTrialEnd() {
  const { data } = useEmbed();

  const { endDate, amount, units } = useMemo(() => {
    const billingSubscription = data?.company?.billingSubscription;
    const end =
      typeof billingSubscription?.trialEnd === "number"
        ? new Date(billingSubscription.trialEnd * 1000)
        : undefined;

    let amount: number | undefined;
    let units: string | undefined;

    if (end) {
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      let unit: string;

      if (difference >= DAYS_IN_MS) {
        amount = Math.floor(difference / DAYS_IN_MS);
        unit = "day";
      } else if (difference >= HOURS_IN_MS) {
        amount = Math.floor(difference / HOURS_IN_MS);
        unit = "hour";
      } else if (difference >= MINUTES_IN_MS) {
        amount = Math.floor(difference / MINUTES_IN_MS);
        unit = "minute";
      } else {
        amount = Math.floor(difference / SECONDS_IN_MS);
        unit = "second";
      }

      units = pluralize(unit, amount);
    }

    return { endDate: end, amount, units };
  }, [data?.company?.billingSubscription]);

  return { endDate, amount, units };
}
