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
  isCheckoutData,
  isHydratedPlan,
} from "../../../utils";
import { cardBoxShadow } from "../../layout";
import { Box, Button, Flex, Icon, Text, Tooltip } from "../../ui";

import { Entitlement } from "./Entitlement";
import {
  type PricingTableOptions,
  type PricingTableProps,
} from "./PricingTable";

interface PlanProps {
  plan: SelectedPlan;
  index: number;
  sharedProps: PricingTableOptions & {
    layout: PricingTableProps;
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
    willSubscriptionCancel,
    isStandalone,
    showCallToAction,
  } = useMemo(() => {
    if (isCheckoutData(data)) {
      const billingSubscription = data.company?.billingSubscription;
      const isTrialSubscription = billingSubscription?.status === "trialing";
      const willSubscriptionCancel =
        typeof billingSubscription?.cancelAt === "number";

      return {
        currentPeriod: data.company?.plan?.planPeriod || "month",
        canCheckout: data.capabilities?.checkout ?? true,
        isTrialSubscription,
        willSubscriptionCancel,
        isStandalone: false,
        showCallToAction: true,
      };
    }

    return {
      currentPeriod: "month",
      canCheckout: true,
      isTrialSubscription: false,
      willSubscriptionCancel: false,
      isStandalone: true,
      showCallToAction:
        typeof sharedProps.callToActionUrl === "string" ||
        typeof sharedProps.onCallToAction === "function",
    };
  }, [data, sharedProps.callToActionUrl, sharedProps.onCallToAction]);

  const callToActionTarget = useMemo(() => {
    if (sharedProps.callToActionTarget) {
      return sharedProps.callToActionTarget;
    }

    if (sharedProps.callToActionUrl) {
      try {
        const ctaUrlOrigin = new URL(sharedProps.callToActionUrl).origin;
        if (ctaUrlOrigin === window.location.hostname) {
          return "_self";
        }
      } catch {
        // fallback to the default value if the provided target value is not a full URL
      }
    }

    return "_blank";
  }, [sharedProps.callToActionUrl, sharedProps.callToActionTarget]);

  const cardPadding = settings.theme.card.padding / TEXT_BASE_SIZE;

  const currentPlanIndex = plans.findIndex(
    (plan) => isHydratedPlan(plan) && plan.current,
  );

  const planPeriod = layout.showPeriodToggle
    ? selectedPeriod
    : plan.yearlyPrice && !plan.monthlyPrice
      ? "year"
      : "month";
  const isActivePlan =
    isHydratedPlan(plan) && plan.current && currentPeriod === planPeriod;
  const { price: planPrice, currency: planCurrency } =
    getPlanPrice(plan, planPeriod) || {};
  const credits = isHydratedPlan(plan)
    ? groupPlanCreditGrants(plan.includedCreditGrants)
    : [];

  const hasUsageBasedEntitlements = plan.entitlements.some(
    (entitlement) => !!entitlement.priceBehavior,
  );
  const isUsageBasedPlan = planPrice === 0 && hasUsageBasedEntitlements;
  const headerPriceFontStyle =
    plan.custom || isUsageBasedPlan
      ? settings.theme.typography.heading3
      : settings.theme.typography[layout.plans.name.fontStyle];

  const count = entitlementCounts[plan.id];
  const isExpanded = count && count.limit > VISIBLE_ENTITLEMENT_COUNT;

  return (
    <Flex
      className="sch-PricingTable_Plan"
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
                : formatCurrency(planPrice ?? 0, planCurrency)}
            {!plan.custom && !isUsageBasedPlan && <sub>/{planPeriod}</sub>}
          </Text>
        </Box>

        {credits.length > 0 && (
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
              {isTrialSubscription &&
              !willSubscriptionCancel &&
              typeof trialEnd !== "undefined"
                ? trialEnd.formatted
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
                  sharedProps={{ layout }}
                  selectedPeriod={planPeriod}
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
          showCallToAction &&
          (layout.upgrade.isVisible || layout.downgrade.isVisible) && (
            <Button
              type="button"
              disabled={
                ((isHydratedPlan(plan) && !plan.valid) || !canCheckout) &&
                !plan.custom
              }
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
                      target: callToActionTarget,
                      rel: "noreferrer",
                    }
                  : {
                      onClick: () => {
                        sharedProps.onCallToAction?.(plan);

                        if (
                          !isStandalone &&
                          isHydratedPlan(plan) &&
                          !plan.custom
                        ) {
                          setCheckoutState({
                            period: planPeriod,
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
              ) : isHydratedPlan(plan) && !plan.valid ? (
                <Tooltip
                  trigger={
                    <Text as={Box} $align="center">
                      {t("Over usage limit")}
                    </Text>
                  }
                  content={
                    <Text>
                      {t("Current usage exceeds the limit of this plan.")}
                    </Text>
                  }
                />
              ) : isHydratedPlan(plan) &&
                plan.companyCanTrial &&
                plan.isTrialable ? (
                t("Start X day trial", { days: plan.trialDays })
              ) : (
                t("Choose plan")
              )}
            </Button>
          )
        )}
      </Flex>
    </Flex>
  );
};
