import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { CreditGrantReason } from "../../../const";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground, useTrialEnd } from "../../../hooks";
import type {
  CreditWithCompanyContext,
  DeepPartial,
  ElementProps,
} from "../../../types";
import {
  darken,
  formatCurrency,
  getFeatureName,
  groupCreditGrants,
  lighten,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { Element, Notice } from "../../layout";
import { Box, Button, Flex, Icon, Text, Tooltip } from "../../ui";

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

  const { data, settings, setLayout } = useEmbed();

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
    return {
      currentPlan: data?.company?.plan,
      currentAddOns: data?.company?.addOns || [],
      creditBundles: data?.creditBundles || [],
      creditGroups: groupCreditGrants(data?.creditGrants || [], {
        groupBy: "bundle",
      }).reduce(
        (
          acc: {
            plan: CreditWithCompanyContext[];
            bundles: CreditWithCompanyContext[];
            promotional: CreditWithCompanyContext[];
          },
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
      ),
      billingSubscription: data?.company?.billingSubscription,
      canCheckout: data?.capabilities?.checkout ?? false,
      postTrialPlan: data?.postTrialPlan,
      featureUsage: data?.featureUsage?.features || [],
      trialPaymentMethodRequired: data?.trialPaymentMethodRequired ?? false,
      showCredits: data?.displaySettings?.showCredits ?? true,
      showZeroPriceAsFree: data?.displaySettings?.showZeroPriceAsFree ?? false,
    };
  }, [
    data?.capabilities?.checkout,
    data?.company?.addOns,
    data?.company?.billingSubscription,
    data?.company?.plan,
    data?.creditBundles,
    data?.creditGrants,
    data?.featureUsage?.features,
    data?.postTrialPlan,
    data?.displaySettings?.showCredits,
    data?.displaySettings?.showZeroPriceAsFree,
    data?.trialPaymentMethodRequired,
  ]);

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

  const { isFreePlan, isUsageBasedPlan } = useMemo(() => {
    const isFreePlan = currentPlan?.planPrice === 0;
    const isUsageBasedPlan = isFreePlan && usageBasedEntitlements.length > 0;
    return { isFreePlan, isUsageBasedPlan };
  }, [currentPlan, usageBasedEntitlements]);

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
          {typeof trialEnd.endDate !== "undefined" && (
            <Text as="h3" display="heading3">
              {t("Trial ends in", trialEnd)}
            </Text>
          )}

          {(trialPaymentMethodRequired || postTrialPlan || currentPlan) && (
            <Text
              as="p"
              $size={0.8125 * settings.theme.typography.text.fontSize}
            >
              {trialPaymentMethodRequired
                ? t("After the trial, subscribe")
                : postTrialPlan
                  ? t("After the trial, cancel", {
                      postTrialPlanName: postTrialPlan.name,
                    })
                  : currentPlan &&
                    t("After the trial, cancel no default", {
                      planName: currentPlan.name,
                    })}
            </Text>
          )}
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
              <Text display={props.header.title.fontStyle} $leading="none">
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
              typeof currentPlan.planPrice === "number" && (
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

                  {!isFreePlan && currentPlan?.planPeriod && (
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
                $leading="none"
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
                $leading="none"
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
                    showCredits={showCredits}
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
                  $leading="none"
                >
                  {t("Credits in plan")}
                </Text>
              )}

              <Flex $flexDirection="column" $gap="1rem">
                {creditGroups.plan.map((group, groupIndex) => {
                  const planCreditGrant =
                    currentPlan?.includedCreditGrants.find(
                      (grant) => grant.creditId === group.id,
                    );
                  const hasAutoTopup =
                    planCreditGrant?.billingCreditAutoTopupEnabled;

                  return (
                    <Flex
                      key={groupIndex}
                      $flexDirection="column"
                      $gap="0.25rem"
                    >
                      <Flex
                        $justifyContent="space-between"
                        $alignItems="baseline"
                        $flexWrap="wrap"
                        $gap="0.5rem"
                      >
                        <Text display={props.addOns.fontStyle}>
                          {group.quantity}{" "}
                          {getFeatureName(group, group.quantity)}{" "}
                          {subscriptionInterval && (
                            <>
                              {t("per")} {t(subscriptionInterval)}
                            </>
                          )}
                        </Text>

                        {group.total.used > 0 && (
                          <Flex $alignItems="baseline">
                            <Text
                              style={{ opacity: 0.54 }}
                              $size={
                                0.875 * settings.theme.typography.text.fontSize
                              }
                              $color={settings.theme.typography.text.color}
                            >
                              {group.total.used} {t("used")}
                            </Text>

                            {hasAutoTopup && (
                              <Tooltip
                                trigger={
                                  <Icon
                                    title="auto top-up"
                                    name="info-rounded"
                                    color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
                                  />
                                }
                                content={
                                  <Text
                                    $size={
                                      0.875 *
                                      settings.theme.typography.text.fontSize
                                    }
                                  >
                                    {typeof planCreditGrant.billingCreditAutoTopupThresholdPercent ===
                                      "number" &&
                                      typeof planCreditGrant.billingCreditAutoTopupAmount ===
                                        "number" &&
                                      t(
                                        "When balance reaches X remaining, an auto top-up of Y credits will be processed.",
                                        {
                                          threshold:
                                            (planCreditGrant.billingCreditAutoTopupThresholdPercent /
                                              100) *
                                            group.quantity,
                                          amount:
                                            planCreditGrant.billingCreditAutoTopupAmount,
                                        },
                                      )}
                                  </Text>
                                }
                              />
                            )}
                          </Flex>
                        )}
                      </Flex>
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
                $leading="none"
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
                $leading="none"
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
              setLayout("checkout");
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
