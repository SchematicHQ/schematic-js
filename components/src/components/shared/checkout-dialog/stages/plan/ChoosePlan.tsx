import { useTranslation } from "react-i18next";

import { SelectedPlan } from "../../../../../types";
import { UsageViolationText } from "../../../../shared";
import { Box, Button, Flex, Text } from "../../../../ui";

import { Selected } from "./Selected";

interface PlanButtonProps {
  plan: SelectedPlan;
  isLoading: boolean;
  isSelected: boolean;
  isCurrentPlan: boolean;
  isValidPlan: boolean;
  onSelect: (updates: {
    plan: SelectedPlan;
    period?: string;
    shouldTrial?: boolean;
  }) => void;
  shouldTrial?: boolean;
}

type ChoosePlanProps = PlanButtonProps;

export const ChoosePlan = ({
  plan,
  isCurrentPlan,
  isValidPlan,
  isLoading,
  isSelected,
  onSelect,
}: ChoosePlanProps) => {
  const { t } = useTranslation();

  return isSelected ? (
    <Selected isCurrent={isCurrentPlan} />
  ) : (
    <Flex $flexDirection="column" $gap="0.5rem">
      <Button
        type="button"
        disabled={(isLoading || !isValidPlan) && !plan.custom}
        {...(plan.custom
          ? {
              as: "a",
              href: plan.customPlanConfig?.ctaWebSite ?? "#",
              target: "_blank",
              rel: "noreferrer",
            }
          : {
              onClick: () => {
                onSelect({ plan });
              },
            })}
        $size="sm"
        $color="primary"
        $variant="filled"
        $fullWidth
      >
        {plan.custom ? (
          (plan.customPlanConfig?.ctaText ?? t("Talk to support"))
        ) : !isValidPlan ? (
          <Text as={Box} $align="center">
            {t("Over plan limit")}
          </Text>
        ) : (
          t("Choose plan")
        )}
      </Button>

      {!plan.valid && <UsageViolationText violations={plan.usageViolations} />}
    </Flex>
  );
};
