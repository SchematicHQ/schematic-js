import { ChangeSubscriptionAction } from "../../../../../const";
import { useEmbed } from "../../../../../hooks";
import type { SelectedPlan } from "../../../../../types";

import { ChoosePlan } from "./ChoosePlan";
import { TrialPlan } from "./TrialPlan";

interface PlanButtonGroupProps {
  plan: SelectedPlan;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: (updates: {
    plan: SelectedPlan;
    period?: string;
    shouldTrial?: boolean;
  }) => void;
  shouldTrial?: boolean;
  subscriptionAction?: ChangeSubscriptionAction;
}

export const PlanButtonGroup = ({
  plan,
  isLoading,
  isSelected,
  onSelect,
  shouldTrial,
}: PlanButtonGroupProps) => {
  const { data } = useEmbed();

  const isTrialing = data?.subscription?.status === "trialing" || false;
  const isCurrentPlan = data?.company?.plan?.id === plan.id;
  const isValidPlan = plan.valid;

  return plan.companyCanTrial && plan.isTrialable ? (
    <TrialPlan
      plan={plan}
      isCurrentPlan={isCurrentPlan}
      isValidPlan={isValidPlan}
      isLoading={isLoading}
      isSelected={isSelected}
      isTrialing={isTrialing}
      onSelect={onSelect}
      shouldTrial={shouldTrial}
    />
  ) : (
    <ChoosePlan
      plan={plan}
      isCurrentPlan={isCurrentPlan}
      isValidPlan={isValidPlan}
      isLoading={isLoading}
      isSelected={isSelected}
      onSelect={onSelect}
    />
  );
};
