import { useMemo } from "react";

import type { CustomPlanBillingResponseData } from "../api/checkoutexternal";
import {
  CustomPlanActivationStrategy,
  CustomPlanBillingStatus,
} from "../api/checkoutexternal";
import { modifyDate } from "../utils";

import { useEmbed } from ".";

export interface CustomPlanBillingState {
  billing: CustomPlanBillingResponseData;
  planName?: string;
  deadline: Date;
  isAwaitingActivation: boolean;
  isAwaitingPayment: boolean;
}

export function useCustomPlanBilling(): CustomPlanBillingState | undefined {
  const { data } = useEmbed();

  return useMemo(() => {
    const billings = data?.company?.customPlanBillings ?? [];
    const pending = billings
      .filter((b) => b.status === CustomPlanBillingStatus.Pending)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const billing = pending[0];
    if (!billing) {
      return undefined;
    }

    const isAwaitingActivation =
      billing.activationStrategy === CustomPlanActivationStrategy.Payment;
    const isAwaitingPayment =
      billing.activationStrategy === CustomPlanActivationStrategy.Publish;

    const anchor = billing.publishedAt ?? billing.createdAt;
    const deadline = modifyDate(anchor, billing.daysUntilDue);

    const currentPlan = data?.company?.plan;
    const planName =
      currentPlan?.id === billing.planId
        ? currentPlan.name
        : data?.company?.plans.find((p) => p.id === billing.planId)?.name;

    return {
      billing,
      planName,
      deadline,
      isAwaitingActivation,
      isAwaitingPayment,
    };
  }, [
    data?.company?.customPlanBillings,
    data?.company?.plan,
    data?.company?.plans,
  ]);
}
