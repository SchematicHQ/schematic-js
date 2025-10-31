import { useTranslation } from "react-i18next";

import { SelectedPlan } from "../../../../../types";
import { UsageViolationText } from "../../../../shared";
import { Box, Button, Flex, Text } from "../../../../ui";

import { Selected } from "./Selected";

interface TrialPlanProps {
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
  isTrialing: boolean;
}

export const TrialPlan = ({
  plan,
  isCurrentPlan,
  isValidPlan,
  isLoading,
  isSelected,
  isTrialing,
  onSelect,
  shouldTrial,
}: TrialPlanProps) => {
  const { t } = useTranslation();

  return (
    <Flex $flexDirection="column" $gap="1.5rem">
      {!isTrialing && (
        <>
          {isSelected && shouldTrial ? (
            <Selected isCurrent={isCurrentPlan} isTrial={shouldTrial} />
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
                        onSelect({
                          plan,
                          shouldTrial: true,
                        });
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
                  t("Start X day trial", { days: plan.trialDays })
                )}
              </Button>

              {!plan.valid && (
                <UsageViolationText violations={plan.usageViolations} />
              )}
            </Flex>
          )}
        </>
      )}

      {!plan.custom && (
        <>
          {isSelected && (!shouldTrial || isTrialing) ? (
            <Selected isCurrent={isCurrentPlan} />
          ) : (
            <Flex $flexDirection="column" $gap="0.5rem">
              <Button
                type="button"
                disabled={isLoading || !isValidPlan}
                onClick={() => {
                  onSelect({ plan, shouldTrial: false });
                }}
                $size="sm"
                $color="primary"
                $variant={isTrialing ? "filled" : "text"}
                $fullWidth
              >
                {!isValidPlan ? (
                  <Box $textAlign="center">
                    <Text as={Box} $align="center">
                      {t("Over plan limit")}
                    </Text>
                  </Box>
                ) : (
                  t("Choose plan")
                )}
              </Button>

              {!plan.valid && (
                <UsageViolationText violations={plan.usageViolations} />
              )}
            </Flex>
          )}
        </>
      )}
    </Flex>
  );
};
