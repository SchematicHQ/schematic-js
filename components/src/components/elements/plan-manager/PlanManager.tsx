import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CreditGrantReason } from "../../../const";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground, useTrialEnd } from "../../../hooks";
import type { Credit, DeepPartial, ElementProps } from "../../../types";
import {
  darken,
  formatCurrency,
  getFeatureName,
  groupCreditGrants,
  isCheckoutData,
  lighten,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { Element, Notice } from "../../layout";
import { Box, Button, Flex, Text } from "../../ui";

import { AddOn } from "./AddOn";
import { UsageDetails } from "./UsageDetails";

interface DesignProps {
  header: {
    isVisible: boolean;
    title: {
      fontStyle: FontStyle;
    };
    description: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
    price: {
      isVisible: boolean;
      fontStyle: FontStyle;
    };
  };
  addOns: {
    isVisible: boolean;
    fontStyle: FontStyle;
    showLabel: boolean;
  };
  callToAction: {
    isVisible: boolean;
    buttonSize: "sm" | "md" | "lg";
    buttonStyle: "primary" | "secondary";
  };
}

const resolveDesignProps = (props: DeepPartial<DesignProps>): DesignProps => {
  return {
    header: {
      isVisible: props.header?.isVisible ?? true,
      title: {
        fontStyle: props.header?.title?.fontStyle ?? "heading1",
      },
      description: {
        isVisible: props.header?.description?.isVisible ?? true,
        fontStyle: props.header?.description?.fontStyle ?? "text",
      },
      price: {
        isVisible: props.header?.price?.isVisible ?? true,
        fontStyle: props.header?.price?.fontStyle ?? "heading3",
      },
    },
    addOns: {
      isVisible: props.addOns?.isVisible ?? true,
      fontStyle: props.addOns?.fontStyle ?? "heading4",
      showLabel: props.addOns?.showLabel ?? true,
    },
    callToAction: {
      isVisible: props.callToAction?.isVisible ?? true,
      buttonSize: props.callToAction?.buttonSize ?? "md",
      buttonStyle: props.callToAction?.buttonStyle ?? "primary",
    },
  };
};

export type PlanManagerProps = DesignProps;

export const PlanManager = forwardRef<
  HTMLDivElement | null,
  ElementProps &
    DeepPartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const { t } = useTranslation();

  const { data, settings, setCheckoutState } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const trialEnd = useTrialEnd();

  /**
   * Can change plan if there is:
   * - a publishable key
   * - a current plan with a billing association
   * - any active plans
   */
  const {
    currentPlan,
    currentAddOns,
    creditBundles,
    creditGroups,
    billingSubscription,
    canCheckout,
    postTrialPlan,
    featureUsage,
    showCredits,
    showZeroPriceAsFree,
    trialPaymentMethodRequired,
  } = useMemo(() => {
    const showCredits = data?.showCredits ?? true;
    const showZeroPriceAsFree = data?.showZeroPriceAsFree ?? false;

    if (isCheckoutData(data)) {
      const {
        company,
        creditBundles,
        creditGrants,
        capabilities,
        postTrialPlan,
        featureUsage,
        trialPaymentMethodRequired,
      } = data;

      const creditGroups = groupCreditGrants(creditGrants, {
        groupBy: "bundle",
      }).reduce(
        (
          acc: { plan: Credit[]; bundles: Credit[]; promotional: Credit[] },
          grant,
        ) => {
          switch (grant.grantReason) {
            case CreditGrantReason.Plan:
              acc.plan.push(grant);
              break;
            case CreditGrantReason.Purchased:
              acc.bundles.push(grant);
              break;
            case CreditGrantReason.Free:
              acc.promotional.push(grant);
          }

          return acc;
        },
        { plan: [], bundles: [], promotional: [] },
      );

      return {
        currentPlan: company?.plan,
        currentAddOns: company?.addOns || [],
        creditBundles,
        creditGroups,
        billingSubscription: company?.billingSubscription,
        canCheckout: capabilities?.checkout ?? true,
        postTrialPlan,
        featureUsage: featureUsage?.features || [],
        trialPaymentMethodRequired: trialPaymentMethodRequired,
        showCredits,
        showZeroPriceAsFree,
      };
    }

    return {
      currentPlan: undefined,
      currentAddOns: [],
      creditBundles: [],
      creditGroups: { plan: [], bundles: [], promotional: [] },
      billingSubscription: undefined,
      canCheckout: false,
      postTrialPlan: undefined,
      featureUsage: [],
      trialPaymentMethodRequired: false,
      showCredits,
      showZeroPriceAsFree,
    };
  }, [data]);

  const usageBasedEntitlements = useMemo(
    () =>
      featureUsage.filter((usage) => typeof usage.priceBehavior === "string"),
    [featureUsage],
  );

  const {
    subscriptionInterval,
    subscriptionCurrency,
    willSubscriptionCancel,
    isTrialSubscription,
  } = useMemo(() => {
    const subscriptionInterval = billingSubscription?.interval;
    const subscriptionCurrency = billingSubscription?.currency;
    const isTrialSubscription = billingSubscription?.status === "trialing";
    const willSubscriptionCancel =
      typeof billingSubscription?.cancelAt === "number" &&
      billingSubscription?.cancelAtPeriodEnd === true;

    return {
      subscriptionInterval,
      subscriptionCurrency,
      isTrialSubscription,
      willSubscriptionCancel,
    };
  }, [billingSubscription]);

  const isFreePlan = currentPlan?.planPrice === 0;
  const isUsageBasedPlan = isFreePlan && usageBasedEntitlements.length > 0;

  return (
    <>
      {isTrialSubscription && !willSubscriptionCancel ? (
        <Notice
          as={Flex}
          $flexDirection="column"
          $gap="0.5rem"
          $padding="1.5rem"
          $textAlign="center"
          $backgroundColor={
            isLightBackground
              ? darken(settings.theme.card.background, 0.04)
              : lighten(settings.theme.card.background, 0.04)
          }
        >
          {typeof trialEnd.formatted !== "undefined" && (
            <Text as="h3" display="heading3">
              {trialEnd.formatted}
            </Text>
          )}

          <Text as="p" $size={0.8125 * settings.theme.typography.text.fontSize}>
            {trialPaymentMethodRequired
              ? t("After the trial, subscribe")
              : postTrialPlan
                ? t("After the trial, cancel", {
                    postTrialPlanName: postTrialPlan?.name,
                  })
                : t("After the trial, cancel no default", {
                    planName: currentPlan?.name,
                  })}
          </Text>
        </Notice>
      ) : (
        willSubscriptionCancel && (
          <Notice
            as={Flex}
            $flexDirection="column"
            $gap="0.5rem"
            $padding="1.5rem"
            $textAlign="center"
            $backgroundColor={
              isLightBackground
                ? darken(settings.theme.card.background, 0.04)
                : lighten(settings.theme.card.background, 0.04)
            }
          >
            <Text as="h3" display="heading3">
              {t("Subscription canceled")}
            </Text>

            {typeof billingSubscription?.cancelAt === "number" && (
              <Text
                as="p"
                $size={0.8125 * settings.theme.typography.text.fontSize}
              >
                {t("Access to plan will end on", {
                  date: toPrettyDate(
                    new Date(billingSubscription.cancelAt * 1000),
                    {
                      month: "numeric",
                    },
                  ),
                })}
              </Text>
            )}
          </Notice>
        )
      )}

      <Element
        as={Flex}
        ref={ref}
        className={className}
        $flexDirection="column"
        $gap="2rem"
      >
        {props.header.isVisible && currentPlan && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Flex $flexDirection="column" $gap="1rem">
              <Text display={props.header.title.fontStyle} $leading={1}>
                {currentPlan.name}
              </Text>

              {props.header.description.isVisible &&
                currentPlan.description && (
                  <Text display={props.header.description.fontStyle}>
                    {currentPlan.description}
                  </Text>
                )}
            </Flex>

            {props.header.price.isVisible &&
              typeof currentPlan.planPrice === "number" &&
              currentPlan.planPeriod && (
                <Box>
                  <Text
                    display={
                      isUsageBasedPlan
                        ? "heading3"
                        : props.header.price.fontStyle
                    }
                  >
                    {isUsageBasedPlan
                      ? t("Usage-based")
                      : isFreePlan && showZeroPriceAsFree
                        ? t("Free")
                        : formatCurrency(
                            currentPlan.planPrice,
                            subscriptionCurrency,
                          )}
                  </Text>

                  {!isFreePlan && (
                    <Text display={props.header.price.fontStyle}>
                      <sub>/{shortenPeriod(currentPlan.planPeriod)}</sub>
                    </Text>
                  )}
                </Box>
              )}
          </Flex>
        )}

        {props.addOns.isVisible && currentAddOns.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem">
            {props.addOns.showLabel && (
              <Text
                $color={
                  isLightBackground
                    ? darken(settings.theme.card.background, 0.46)
                    : lighten(settings.theme.card.background, 0.46)
                }
                $leading={1}
              >
                {t("Add-ons")}
              </Text>
            )}

            <Flex $flexDirection="column" $gap="1rem">
              {currentAddOns.map((addOn, addOnIndex) => (
                <AddOn
                  key={addOnIndex}
                  addOn={addOn}
                  currency={subscriptionCurrency}
                  layout={props}
                />
              ))}
            </Flex>
          </Flex>
        )}

        {props.addOns.isVisible && usageBasedEntitlements.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem">
            {props.addOns.showLabel && (
              <Text
                $color={
                  isLightBackground
                    ? darken(settings.theme.card.background, 0.46)
                    : lighten(settings.theme.card.background, 0.46)
                }
                $leading={1}
              >
                {t("Usage-based")}
              </Text>
            )}

            <Flex $flexDirection="column" $gap="1rem">
              {usageBasedEntitlements.map((entitlement, entitlementIndex) => {
                return (
                  <UsageDetails
                    key={entitlementIndex}
                    entitlement={entitlement}
                    period={currentPlan?.planPeriod || "month"}
                    layout={props}
                  />
                );
              })}
            </Flex>
          </Flex>
        )}

        {props.addOns.isVisible &&
          showCredits &&
          creditGroups.plan.length > 0 && (
            <Flex $flexDirection="column" $gap="0.5rem">
              {props.addOns.showLabel && (
                <Text
                  $color={
                    isLightBackground
                      ? darken(settings.theme.card.background, 0.46)
                      : lighten(settings.theme.card.background, 0.46)
                  }
                  $leading={1}
                >
                  {t("Credits in plan")}
                </Text>
              )}

              <Flex $flexDirection="column" $gap="1rem">
                {creditGroups.plan.map((group, groupIndex) => {
                  return (
                    <Flex
                      key={groupIndex}
                      $justifyContent="space-between"
                      $alignItems="center"
                      $flexWrap="wrap"
                      $gap="0.5rem"
                    >
                      <Text display={props.addOns.fontStyle}>
                        {group.quantity} {getFeatureName(group, group.quantity)}{" "}
                        {subscriptionInterval && (
                          <>
                            {t("per")} {t(subscriptionInterval)}
                          </>
                        )}
                      </Text>

                      {group.total.used > 0 && (
                        <Text
                          style={{ opacity: 0.54 }}
                          $size={
                            0.875 * settings.theme.typography.text.fontSize
                          }
                          $color={settings.theme.typography.text.color}
                        >
                          {group.total.used} {t("used")}
                        </Text>
                      )}
                    </Flex>
                  );
                })}
              </Flex>
            </Flex>
          )}

        {props.addOns.isVisible && creditGroups.bundles.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem">
            {props.addOns.showLabel && (
              <Text
                $color={
                  isLightBackground
                    ? darken(settings.theme.card.background, 0.46)
                    : lighten(settings.theme.card.background, 0.46)
                }
                $leading={1}
              >
                {t("Credit bundles")}
              </Text>
            )}

            <Flex $flexDirection="column" $gap="1rem">
              {creditGroups.bundles.map((group, groupIndex) => {
                const bundle = group?.bundleId
                  ? creditBundles.find((b) => b.id === group.bundleId)
                  : undefined;

                return (
                  <Flex
                    key={groupIndex}
                    $justifyContent="space-between"
                    $alignItems="center"
                    $flexWrap="wrap"
                    $gap="0.5rem"
                  >
                    {bundle ? (
                      <Text display={props.addOns.fontStyle}>
                        {group.grants.length > 1 && (
                          <Text style={{ opacity: 0.5 }}>
                            ({group.grants.length}){" "}
                          </Text>
                        )}
                        {bundle.name} ({group.quantity}{" "}
                        {getFeatureName(group, group.quantity)})
                      </Text>
                    ) : (
                      <Text display={props.addOns.fontStyle}>
                        {group.quantity} {getFeatureName(group, group.quantity)}
                      </Text>
                    )}

                    {group.total.used > 0 && (
                      <Text
                        style={{ opacity: 0.54 }}
                        $size={0.875 * settings.theme.typography.text.fontSize}
                        $color={settings.theme.typography.text.color}
                      >
                        {group.total.used} {t("used")}
                      </Text>
                    )}
                  </Flex>
                );
              })}
            </Flex>
          </Flex>
        )}

        {props.addOns.isVisible && creditGroups.promotional.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem">
            {props.addOns.showLabel && (
              <Text
                $color={
                  isLightBackground
                    ? darken(settings.theme.card.background, 0.46)
                    : lighten(settings.theme.card.background, 0.46)
                }
                $leading={1}
              >
                {t("Promotional credits")}
              </Text>
            )}

            <Flex $flexDirection="column" $gap="1rem">
              {creditGroups.promotional.map((group, groupIndex) => {
                return (
                  <Flex
                    key={groupIndex}
                    $justifyContent="space-between"
                    $alignItems="center"
                    $flexWrap="wrap"
                    $gap="0.5rem"
                  >
                    <Text display={props.addOns.fontStyle}>
                      {group.quantity} {getFeatureName(group, group.quantity)}
                    </Text>

                    {group.total.used > 0 && (
                      <Text
                        style={{ opacity: 0.54 }}
                        $size={0.875 * settings.theme.typography.text.fontSize}
                        $color={settings.theme.typography.text.color}
                      >
                        {group.total.used} {t("used")}
                      </Text>
                    )}
                  </Flex>
                );
              })}
            </Flex>
          </Flex>
        )}

        {canCheckout && props.callToAction.isVisible && (
          <Button
            type="button"
            onClick={() => {
              setCheckoutState({
                planId: currentPlan?.id,
                addOnId: undefined,
                usage: false,
              });
            }}
            $size={props.callToAction.buttonSize}
            $color={props.callToAction.buttonStyle}
            $fullWidth
          >
            {t("Change plan")}
          </Button>
        )}
      </Element>
    </>
  );
});

PlanManager.displayName = "PlanManager";
