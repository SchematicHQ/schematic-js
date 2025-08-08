import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import {
  DAYS_IN_MS,
  HOURS_IN_MS,
  MINUTES_IN_MS,
  SECONDS_IN_MS,
} from "../const";
import { isCheckoutData, pluralize } from "../utils";

import { useEmbed } from ".";

export function useTrialEnd() {
  const { t } = useTranslation();

  const { data } = useEmbed();

  const { endDate, formatted } = useMemo(() => {
    const billingSubscription = isCheckoutData(data)
      ? data.company?.billingSubscription
      : undefined;

    const end =
      typeof billingSubscription?.trialEnd === "number"
        ? new Date(billingSubscription.trialEnd * 1000)
        : undefined;

    let formatted: string | undefined;

    if (end) {
      const now = new Date();
      const difference = end.getTime() - now.getTime();

      let amount: number | undefined;
      let unit: string | undefined;

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

      formatted = t("Trial ends in", {
        amount,
        units: pluralize(unit, amount),
      });
    }

    return { endDate: end, formatted };
  }, [t, data]);

  return { endDate, formatted };
}
