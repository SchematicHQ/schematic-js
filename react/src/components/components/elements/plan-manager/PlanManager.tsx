import { forwardRef } from "react";
import { useTranslation } from "react-i18next";

import {
  PlanManager as PlanManagerPrimitive,
  usePlanManager,
} from "../../../composable/plan-manager";
import { type FontStyle } from "../../../embed";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { DeepPartial, ElementProps } from "../../../types";
import {
  darken,
  formatCurrency,
  getAutoTopupAmount,
  getAutoTopupThresholdCredits,
  getFeatureName,
  isAutoTopupEnabled,
  lighten,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { Element, Notice } from "../../layout";
import { AutoTopupNotice } from "../../shared";
import { Box, Button, Flex, Text } from "../../ui";

import { AddOn } from "./AddOn";
import { UsageDetails } from "./UsageDetails";

export interface DesignProps {
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
>(({ className, ...rest }, ref) => {
  const design = resolveDesignProps(rest);

  return (
    <PlanManagerPrimitive.Root>
      <PlanManagerBody ref={ref} design={design} className={className} />
    </PlanManagerPrimitive.Root>
  );
});

PlanManager.displayName = "PlanManager";

interface PlanManagerBodyProps {
  design: DesignProps;
  className?: string;
}

const PlanManagerBody = forwardRef<HTMLDivElement | null, PlanManagerBodyProps>(
  ({ design, className }, ref) => {
    const { t } = useTranslation();

    const { settings } = useEmbed();

    const isLightBackground = useIsLightBackground();

    const {
      currentPlan,
      currentAddOns,
      creditBundles,
      creditGroups,
      billingSubscription,
      canCheckout,
      postTrialPlan,
      usageBasedEntitlements,
      showCredits,
      showZeroPriceAsFree,
      trialPaymentMethodRequired,
      scheduledDowngrade,
      subscriptionInterval,
      subscriptionCurrency,
      willSubscriptionCancel,
      isTrialSubscription,
      currentPlanPeriod,
      isFreePlan,
      isUsageBasedPlan,
      hasAutoTopupSelfService,
      customPlanBilling,
      trialEnd,
      changePlan,
      editAutoTopup,
    } = usePlanManager();

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
      ) : willSubscriptionCancel ? (
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
              {t("Access to plan will end.", {
                plan: currentPlan?.name || "plan",
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
      ) : customPlanBilling ? (
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
            {customPlanBilling.isAwaitingActivation
              ? t("Custom plan awaiting payment", {
                  plan: customPlanBilling.planName ?? t("your plan"),
                })
              : t("Custom plan payment due", {
                  plan: customPlanBilling.planName ?? t("your plan"),
                  date: toPrettyDate(customPlanBilling.deadline, {
                    month: "numeric",
                  }),
                })}
          </Text>

          <Text as="p" $size={0.8125 * settings.theme.typography.text.fontSize}>
            {customPlanBilling.isAwaitingActivation
              ? t("Custom plan awaiting payment description", {
                  date: toPrettyDate(customPlanBilling.deadline, {
                    month: "numeric",
                  }),
                })
              : t("Custom plan payment due description", {
                  plan: customPlanBilling.planName ?? t("your plan"),
                  date: toPrettyDate(customPlanBilling.deadline, {
                    month: "numeric",
                  }),
                })}
          </Text>

          {customPlanBilling.billing.stripeInvoiceUrl && (
            <Button
              as="a"
              href={customPlanBilling.billing.stripeInvoiceUrl}
              target="_blank"
              rel="noopener noreferrer"
              $size="md"
              $color="primary"
            >
              {t("Pay now")}
            </Button>
          )}
        </Notice>
      ) : (
        scheduledDowngrade?.toPlanName && (
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
              {t("Downgrade to plan scheduled", {
                plan: scheduledDowngrade.toPlanName,
              })}
            </Text>

            {typeof billingSubscription?.periodEnd === "number" && (
              <Text
                as="p"
                $size={0.8125 * settings.theme.typography.text.fontSize}
              >
                {t("Access to plan will end.", {
                  plan: scheduledDowngrade.fromPlanName,
                  date: toPrettyDate(
                    new Date(billingSubscription.periodEnd * 1000),
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
        {design.header.isVisible && currentPlan && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Flex $flexDirection="column" $gap="1rem">
              <Text display={design.header.title.fontStyle} $leading="none">
                {currentPlan.name}
              </Text>

              {design.header.description.isVisible &&
                currentPlan.description && (
                  <Text display={design.header.description.fontStyle}>
                    {currentPlan.description}
                  </Text>
                )}
            </Flex>

            {design.header.price.isVisible &&
              typeof currentPlan.planPrice === "number" && (
                <Box>
                  <Text
                    display={
                      isUsageBasedPlan
                        ? "heading3"
                        : design.header.price.fontStyle
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

                  {!isFreePlan && currentPlanPeriod && (
                    <Text display={design.header.price.fontStyle}>
                      <sub>/{shortenPeriod(currentPlanPeriod)}</sub>
                    </Text>
                  )}
                </Box>
              )}
          </Flex>
        )}

        {design.addOns.isVisible && currentAddOns.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem">
            {design.addOns.showLabel && (
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
                  period={currentPlanPeriod}
                  layout={design}
                />
              ))}
            </Flex>
          </Flex>
        )}

        {design.addOns.isVisible && usageBasedEntitlements.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem">
            {design.addOns.showLabel && (
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
                    period={currentPlanPeriod || "month"}
                    currency={subscriptionCurrency}
                    showCredits={showCredits}
                    layout={design}
                  />
                );
              })}
            </Flex>
          </Flex>
        )}

        {design.addOns.isVisible &&
          showCredits &&
          creditGroups.plan.length > 0 && (
            <Flex $flexDirection="column" $gap="0.5rem">
              {design.addOns.showLabel && (
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
                  const hasAutoTopup = isAutoTopupEnabled(planCreditGrant);
                  const thresholdCredits =
                    getAutoTopupThresholdCredits(planCreditGrant);
                  const topupAmount = getAutoTopupAmount(planCreditGrant);

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
                        <Text display={design.addOns.fontStyle}>
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
                              {hasAutoTopup && planCreditGrant && (
                                <AutoTopupNotice
                                  thresholdCredits={thresholdCredits}
                                  topupAmount={topupAmount}
                                />
                              )}
                            </Text>
                          </Flex>
                        )}
                      </Flex>
                    </Flex>
                  );
                })}
              </Flex>

              {hasAutoTopupSelfService && (
                <Flex
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="0.5rem"
                  $padding="1.5rem"
                  $backgroundColor={
                    isLightBackground
                      ? darken(settings.theme.card.background, 0.04)
                      : lighten(settings.theme.card.background, 0.04)
                  }
                  $borderRadius="0.5rem"
                >
                  <Flex $flexDirection="column" $gap="0.5rem">
                    <Text display={design.addOns.fontStyle}>
                      {t("Auto top-up")}
                    </Text>
                    {currentPlan?.includedCreditGrants.reduce(
                      (acc: React.ReactNode[], grant) => {
                        if (
                          !grant.credit ||
                          !grant.billingCreditAutoTopupSelfService
                        ) {
                          return acc;
                        }

                        const autoTopupEnabled =
                          grant.companyAutoTopupEnabled ?? false;

                        if (!autoTopupEnabled) {
                          acc.push(
                            <Text key={grant.id} $leading="tight">
                              {t("Auto top-up disabled for token", {
                                unit: getFeatureName(grant.credit, 1),
                              })}
                            </Text>,
                          );

                          return acc;
                        }

                        const autoTopupThresholdCredits =
                          getAutoTopupThresholdCredits(grant);
                        const autoTopupAmount = getAutoTopupAmount(grant);

                        if (
                          typeof autoTopupThresholdCredits === "number" &&
                          typeof autoTopupAmount === "number"
                        ) {
                          acc.push(
                            <Text key={grant.id} $leading="tight">
                              {t("Adds X tokens when Y remaining in balance", {
                                unit: getFeatureName(
                                  grant.credit,
                                  autoTopupAmount,
                                ),
                                amount: autoTopupAmount,
                                threshold: autoTopupThresholdCredits,
                              })}
                            </Text>,
                          );
                        }

                        return acc;
                      },
                      [],
                    )}
                  </Flex>

                  <Button
                    type="button"
                    onClick={editAutoTopup}
                    $size="sm"
                    $variant="ghost"
                  >
                    {t("Edit")}
                  </Button>
                </Flex>
              )}
            </Flex>
          )}

        {design.addOns.isVisible && creditGroups.bundles.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem">
            {design.addOns.showLabel && (
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
                      <Text display={design.addOns.fontStyle}>
                        {group.grants.length > 1 && (
                          <Text style={{ opacity: 0.5 }}>
                            ({group.grants.length}){" "}
                          </Text>
                        )}
                        {bundle.name} ({group.quantity}{" "}
                        {getFeatureName(group, group.quantity)})
                      </Text>
                    ) : (
                      <Text display={design.addOns.fontStyle}>
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

        {design.addOns.isVisible && creditGroups.promotional.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem">
            {design.addOns.showLabel && (
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
                    <Text display={design.addOns.fontStyle}>
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

        {canCheckout &&
          design.callToAction.isVisible &&
          !customPlanBilling?.isAwaitingActivation && (
            <Button
              type="button"
              onClick={changePlan}
              $size={design.callToAction.buttonSize}
              $color={design.callToAction.buttonStyle}
              $fullWidth
            >
              {t("Change plan")}
            </Button>
          )}
      </Element>
    </>
  );
});

PlanManagerBody.displayName = "PlanManagerBody";
