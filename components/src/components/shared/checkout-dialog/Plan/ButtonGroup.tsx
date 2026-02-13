import { useTranslation } from "react-i18next";

import { CompanyPlanInvalidReason } from "../../../../const";
import { useEmbed } from "../../../../hooks";
import { SelectedPlan } from "../../../../types";
import { UsageViolationText } from "../../../shared";
import { Button, Flex } from "../../../ui";

import { Selected } from "./Selected";

export interface ButtonGroupProps {
  plan: SelectedPlan;
  isLoading: boolean;
  isSelected: boolean;
  onSelect: (updates: {
    plan: SelectedPlan;
    period?: string;
    shouldTrial?: boolean;
  }) => void;
  shouldTrial?: boolean;
}

export const ButtonGroup = ({
  plan,
  isLoading,
  isSelected,
  onSelect,
  shouldTrial,
}: ButtonGroupProps) => {
  const { t } = useTranslation();

  const { data } = useEmbed();

  const isTrialing = data?.company?.billingSubscription?.status === "trialing";
  const isCurrentPlan = data?.company?.plan?.id === plan.id;
  const isValidPlan = plan.valid;
  const isDowngradeNotPermitted =
    plan.invalidReason === CompanyPlanInvalidReason.DowngradeNotPermitted;
  const isDisabled =
    (isLoading || (!isValidPlan && !isDowngradeNotPermitted)) && !plan.custom;

  if (plan.companyCanTrial && plan.isTrialable) {
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
                  disabled={isDisabled}
                  {...(plan.custom
                    ? {
                        as: "a",
                        href: plan.customPlanConfig?.ctaWebSite ?? "#",
                        target: "_blank",
                        rel: "noreferrer",
                      }
                    : isDowngradeNotPermitted
                      ? {
                          as: "a",
                          href: data?.preventSelfServiceDowngradeUrl ?? "#",
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
                  {plan.custom
                    ? (plan.customPlanConfig?.ctaText ?? t("Talk to support"))
                    : isDowngradeNotPermitted
                      ? (data?.preventSelfServiceDowngradeButtonText ??
                        t("Talk to support"))
                      : !isValidPlan
                        ? t("Over plan limit")
                        : t("Start X day trial", { days: plan.trialDays })}
                </Button>

                {!isValidPlan && (
                  <UsageViolationText violations={plan.usageViolations} />
                )}
              </Flex>
            )}
          </>
        )}

        {!plan.custom && (
          <>
            {isSelected && (!shouldTrial || isTrialing) ? (
              <Selected isCurrent={isCurrentPlan} isTrial={isTrialing} />
            ) : (
              <Flex $flexDirection="column" $gap="0.5rem">
                <Button
                  type="button"
                  disabled={isDisabled}
                  onClick={() => {
                    onSelect({ plan, shouldTrial: false });
                  }}
                  $size="sm"
                  $color="primary"
                  $variant={isTrialing ? "filled" : "text"}
                  $fullWidth
                >
                  {!isValidPlan ? t("Over plan limit") : t("Choose plan")}
                </Button>

                {!isValidPlan && (
                  <UsageViolationText violations={plan.usageViolations} />
                )}
              </Flex>
            )}
          </>
        )}
      </Flex>
    );
  }

  return isSelected ? (
    <Selected isCurrent={isCurrentPlan} />
  ) : (
    <Flex $flexDirection="column" $gap="0.5rem">
      <Button
        type="button"
        disabled={isDisabled}
        {...(plan.custom
          ? {
              as: "a",
              href: plan.customPlanConfig?.ctaWebSite ?? "#",
              target: "_blank",
              rel: "noreferrer",
            }
          : isDowngradeNotPermitted
            ? {
                as: "a",
                href: data?.preventSelfServiceDowngradeUrl ?? "#",
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
        {plan.custom
          ? (plan.customPlanConfig?.ctaText ?? t("Talk to support"))
          : isDowngradeNotPermitted
            ? (data?.preventSelfServiceDowngradeButtonText ??
              t("Talk to support"))
            : !isValidPlan
              ? t("Over plan limit")
              : t("Choose plan")}
      </Button>

      {!isValidPlan && <UsageViolationText violations={plan.usageViolations} />}
    </Flex>
  );
};
