import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { TEXT_BASE_SIZE, VISIBLE_ENTITLEMENT_COUNT } from "../../../const";
import { useEmbed, useIsLightBackground, useTrialEnd } from "../../../hooks";
import type { SelectedPlan } from "../../../types";
import {
  formatCurrency,
  getFeatureName,
  getPlanPrice,
  groupPlanCreditGrants,
  hexToHSL,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { UsageViolationText } from "../../shared";
import { Box, Button, Flex, Icon, Text } from "../../ui";

import { Entitlement } from "./Entitlement";
import {
  type PricingTableOptions,
  type PricingTableProps,
} from "./PricingTable";

export interface PlanProps {
  plan: SelectedPlan;
  index: number;
  sharedProps: PricingTableOptions & {
    layout: PricingTableProps;
    showCallToAction: boolean;
  };
  plans: SelectedPlan[];
  selectedPeriod: string;
  entitlementCounts: Record<
    string,
    | {
        size: number;
        limit: number;
      }
    | undefined
  >;
  handleToggleShowAll: (id: string) => void;
}

export const Plan = ({
  plan,
  index,
  sharedProps,
  plans,
  selectedPeriod,
  entitlementCounts,
  handleToggleShowAll,
}: PlanProps) => {
  const { layout } = sharedProps;

  const { t } = useTranslation();

  const { data, settings, setCheckoutState } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const trialEnd = useTrialEnd();

  const {
    currentPeriod,
    canCheckout,
    isTrialSubscription,
    isStandalone,
    showCredits,
    showZeroPriceAsFree,
  } = useMemo(() => {
    const isStandalone = typeof data?.component === "undefined";

    return {
      currentPeriod: data?.company?.plan?.planPeriod || "month",
      canCheckout: isStandalone || (data?.capabilities?.checkout ?? true),
      isTrialSubscription:
        data?.company?.billingSubscription?.status === "trialing",
      isStandalone,
      showCredits: data?.showCredits ?? true,
      showZeroPriceAsFree: data?.showZeroPriceAsFree ?? false,
    };
  }, [
    data?.capabilities?.checkout,
    data?.company?.billingSubscription?.status,
    data?.company?.plan?.planPeriod,
    data?.component,
    data?.showCredits,
    data?.showZeroPriceAsFree,
  ]);

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  const currentPlanIndex = plans.findIndex((plan) => plan.current);

  const isActivePlan = plan.current && currentPeriod === selectedPeriod;
  const { price: planPrice, currency: planCurrency } =
    getPlanPrice(plan, selectedPeriod) || {};
  const credits = groupPlanCreditGrants(plan.includedCreditGrants);

  const hasUsageBasedEntitlements = plan.entitlements.some(
    (entitlement) => !!entitlement.priceBehavior,
  );
  const isFreePlan = planPrice === 0;
  const isUsageBasedPlan = isFreePlan && hasUsageBasedEntitlements;
  const headerPriceFontStyle =
    settings.theme.typography[layout.plans.name.fontStyle];

  const count = entitlementCounts[plan.id];
  const isExpanded = count && count.limit > VISIBLE_ENTITLEMENT_COUNT;

  return (
    <Flex
      className="sch-PricingTable_Plan"
      data-testid="sch-plan"
      data-plan-id={plan.id}
      $position="relative"
      $flexDirection="column"
      $padding={`${cardPadding}rem 0`}
      $backgroundColor={settings.theme.card.background}
      $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
      $outlineWidth="2px"
      $outlineStyle="solid"
      $outlineColor={isActivePlan ? settings.theme.primary : "transparent"}
      {...(settings.theme.card.hasShadow && {
        $boxShadow: cardBoxShadow,
      })}
    >
      <Flex
        $flexDirection="column"
        $gap="0.75rem"
        $padding={`0 ${cardPadding}rem ${0.75 * cardPadding}rem`}
        $borderWidth={0}
        $borderBottomWidth="1px"
        $borderStyle="solid"
        $borderColor={
          isLightBackground
            ? "hsla(0, 0%, 0%, 0.175)"
            : "hsla(0, 0%, 100%, 0.175)"
        }
      >
        <Box>
          <Text display={layout.plans.name.fontStyle}>{plan.name}</Text>
        </Box>

        {layout.plans.description.isVisible && (
          <Box $marginBottom="0.5rem">
            <Text display={layout.plans.description.fontStyle}>
              {plan.description}
            </Text>
          </Box>
        )}

        <Box>
          <Text
            data-testid="sch-plan-price"
            $font={headerPriceFontStyle.fontFamily}
            $size={headerPriceFontStyle.fontSize}
            $weight={headerPriceFontStyle.fontWeight}
            $color={headerPriceFontStyle.color}
          >
            {plan.custom
              ? plan.customPlanConfig?.priceText
                ? plan.customPlanConfig.priceText
                : t("Custom price")
              : isUsageBasedPlan
                ? t("Usage-based")
                : isFreePlan && showZeroPriceAsFree
                  ? t("Free")
                  : formatCurrency(planPrice ?? 0, planCurrency)}
            {!plan.custom && !isFreePlan && <sub>/{selectedPeriod}</sub>}
          </Text>
        </Box>

        {showCredits && credits.length > 0 && (
          <Flex
            $flexDirection="column"
            $gap="1rem"
            $flexGrow={1}
            $marginTop="0.5rem"
          >
            {credits.map((credit, idx) => {
              return (
                <Flex key={idx} $gap="1rem">
                  {layout.plans.showFeatureIcons && credit.icon && (
                    <Icon
                      data-testid="sch-feature-icon"
                      name={credit.icon}
                      color={settings.theme.primary}
                      background={`color-mix(in oklch, ${settings.theme.card.background} 87.5%, ${isLightBackground ? "black" : "white"})`}
                      rounded
                    />
                  )}

                  {credit.name && (
                    <Flex
                      $flexDirection="column"
                      $justifyContent="center"
                      $gap="0.5rem"
                    >
                      <Text>
                        {credit.quantity}{" "}
                        {getFeatureName(credit, credit.quantity)}
                        {credit.period && (
                          <>
                            {" "}
                            {t("per")} {credit.period}
                          </>
                        )}
                      </Text>
                    </Flex>
                  )}
                </Flex>
              );
            })}
          </Flex>
        )}

        {isActivePlan && (
          <Flex
            data-testid="sch-plan-active"
            $position="absolute"
            $right="1rem"
            $top="1rem"
            $backgroundColor={settings.theme.primary}
            $borderRadius="9999px"
            $padding="0.125rem 0.85rem"
          >
            <Text
              $size={0.75 * settings.theme.typography.text.fontSize}
              $color={
                hexToHSL(settings.theme.primary).l > 50 ? "#000000" : "#FFFFFF"
              }
            >
              {isTrialSubscription && typeof trialEnd.endDate !== "undefined"
                ? t("X time left in trial", trialEnd)
                : t("Active")}
            </Text>
          </Flex>
        )}
      </Flex>

      <Flex
        $flexDirection="column"
        $justifyContent="end"
        $flexGrow={1}
        $gap={`${cardPadding}rem`}
        $padding={`${0.75 * cardPadding}rem ${cardPadding}rem 0`}
      >
        {layout.plans.showEntitlements && (
          <Flex $flexDirection="column" $gap="1rem" $flexGrow={1}>
            {layout.plans.showInclusionText && index > 0 && (
              <Box $marginBottom="1.5rem">
                <Text>
                  {t("Everything in", {
                    plan: plans[index - 1].name,
                  })}
                </Text>
              </Box>
            )}

            {plan.entitlements
              .map((entitlement, idx) => (
                <Entitlement
                  key={idx}
                  entitlement={entitlement}
                  credits={credits}
                  selectedPeriod={selectedPeriod}
                  showCredits={showCredits}
                  sharedProps={{ layout }}
                />
              ))
              .slice(0, count?.limit ?? VISIBLE_ENTITLEMENT_COUNT)}

            {(count?.size || plan.entitlements.length) >
              VISIBLE_ENTITLEMENT_COUNT && (
              <Flex
                $justifyContent="start"
                $alignItems="center"
                $gap="0.5rem"
                $marginTop="1rem"
              >
                <Icon
                  name={isExpanded ? "chevron-up" : "chevron-down"}
                  color="#D0D0D0"
                />
                <Text
                  onClick={() => handleToggleShowAll(plan.id)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      handleToggleShowAll(plan.id);
                    }
                  }}
                  style={{ cursor: "pointer" }}
                  display="link"
                  $leading={1}
                >
                  {isExpanded ? t("Hide all") : t("See all")}
                </Text>
              </Flex>
            )}
          </Flex>
        )}

        {isActivePlan ? (
          <Flex
            $justifyContent="center"
            $alignItems="center"
            $gap="0.25rem"
            $padding="0.625rem 0"
          >
            <Icon
              name="check-rounded"
              size="sm"
              color={settings.theme.primary}
            />

            <Text $size={15} $leading={1}>
              {t("Current plan")}
            </Text>
          </Flex>
        ) : (
          sharedProps.showCallToAction &&
          (layout.upgrade.isVisible || layout.downgrade.isVisible) && (
            <Flex $flexDirection="column" $gap="0.5rem">
              <Button
                type="button"
                disabled={(!plan.valid || !canCheckout) && !plan.custom}
                data-testid="sch-plan-cta-button"
                {...(index > currentPlanIndex
                  ? {
                      $size: layout.upgrade.buttonSize,
                      $color: layout.upgrade.buttonStyle,
                      $variant: "filled",
                    }
                  : {
                      $size: layout.downgrade.buttonSize,
                      $color: layout.downgrade.buttonStyle,
                      $variant: "outline",
                    })}
                {...(plan.custom
                  ? {
                      as: "a",
                      href: plan.customPlanConfig?.ctaWebSite ?? "#",
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : sharedProps.callToActionUrl
                    ? {
                        as: "a",
                        href: sharedProps.callToActionUrl,
                        target: sharedProps.callToActionTarget,
                        rel: "noreferrer",
                      }
                    : {
                        onClick: () => {
                          sharedProps.onCallToAction?.(plan);

                          if (!isStandalone && !plan.custom) {
                            setCheckoutState({
                              period: selectedPeriod,
                              planId: isActivePlan ? null : plan.id,
                              usage: false,
                            });
                          }
                        },
                      })}
                $fullWidth
              >
                {plan.custom ? (
                  (plan.customPlanConfig?.ctaText ?? t("Talk to support"))
                ) : !plan.valid ? (
                  <Text as={Box} $align="center">
                    {t("Over plan limit")}
                  </Text>
                ) : (
                  t("Choose plan")
                )}
              </Button>

              {!plan.valid && (
                <UsageViolationText violations={plan.usageViolations} />
              )}
            </Flex>
          )
        )}
      </Flex>
    </Flex>
  );
};
