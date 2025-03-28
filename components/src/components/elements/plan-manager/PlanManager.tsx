import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import { type FeatureUsageResponseData } from "../../../api";
import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import {
  darken,
  formatCurrency,
  getBillingPrice,
  getFeatureName,
  hexToHSL,
  lighten,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { Element } from "../../layout";
import { Box, EmbedButton, Flex, Text } from "../../ui";

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

const resolveDesignProps = (
  props: RecursivePartial<DesignProps>,
): DesignProps => {
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
    RecursivePartial<DesignProps> &
    React.HTMLAttributes<HTMLDivElement> & {
      portal?: HTMLElement | null;
    }
>(({ children, className, portal, ...rest }, ref) => {
  const props = resolveDesignProps(rest);

  const theme = useTheme();

  const { t } = useTranslation();

  const { data, setLayout, setSelected } = useEmbed();

  const isLightBackground = useIsLightBackground();

  // Can change plan if there is a publishable key, a current plan with a billing association, and
  // some active plans
  const { addOns, canCheckout, currentPlan, defaultPlan, featureUsage } = {
    addOns: data.company?.addOns || [],
    currentPlan: data.company?.plan,
    canCheckout: data.capabilities?.checkout ?? true,
    defaultPlan: data.defaultPlan,
    featureUsage: data.featureUsage,
  };

  const usageBasedEntitlements = (featureUsage?.features || []).reduce(
    (
      acc: (FeatureUsageResponseData & {
        price?: number;
        currency?: string;
      })[],
      usage,
    ) => {
      const { price, currency } =
        getBillingPrice(
          currentPlan?.planPeriod === "year"
            ? usage.yearlyUsageBasedPrice
            : usage.monthlyUsageBasedPrice,
        ) || {};

      if (usage.priceBehavior) {
        acc.push({ ...usage, price, currency });
      }

      return acc;
    },
    [],
  );

  const billingSubscription = data.company?.billingSubscription;
  const trialEndDays = useMemo(() => {
    const trialEnd = billingSubscription?.trialEnd;
    const trialEndDate = trialEnd ? new Date(trialEnd * 1000) : new Date();
    const todayDate = new Date();
    return Math.floor(
      (trialEndDate.getTime() - todayDate.getTime()) / (1000 * 60 * 60 * 24),
    );
  }, [billingSubscription?.trialEnd]);

  const subscriptionCurrency = billingSubscription?.currency;
  const isTrialSubscription = billingSubscription?.status === "trialing";
  const willSubscriptionCancel = billingSubscription?.cancelAtPeriodEnd;
  const isUsageBasedPlan =
    currentPlan?.planPrice === 0 && usageBasedEntitlements.length > 0;

  const headerPriceFontStyle = isUsageBasedPlan
    ? theme.typography.heading3
    : theme.typography[props.header.price.fontStyle];

  return (
    <>
      {isTrialSubscription && !willSubscriptionCancel ? (
        <Box
          $backgroundColor={
            isLightBackground
              ? "hsla(0, 0%, 0%, 0.04)"
              : "hsla(0, 0%, 100%, 0.04)"
          }
          $textAlign="center"
          $padding="1rem"
        >
          <Text
            as="h3"
            $font={theme.typography.heading3.fontFamily}
            $size={theme.typography.heading3.fontSize}
            $weight={theme.typography.heading3.fontWeight}
            $color={theme.typography.heading3.color}
          >
            {t("Trial ends in", { days: trialEndDays.toString() })}
          </Text>

          <Text
            as="p"
            $font={theme.typography.text.fontFamily}
            $size={0.8125 * theme.typography.text.fontSize}
            $weight={theme.typography.text.fontWeight}
            $color={theme.typography.text.color}
          >
            {data.trialPaymentMethodRequired
              ? t("After the trial, subscribe")
              : defaultPlan
                ? t("After the trial, cancel", {
                    defaultPlanName: defaultPlan?.name,
                  })
                : t("After the trial, cancel no default", {
                    planName: currentPlan?.name,
                  })}
          </Text>
        </Box>
      ) : (
        willSubscriptionCancel && (
          <Box
            $backgroundColor={
              isLightBackground
                ? "hsla(0, 0%, 0%, 0.04)"
                : "hsla(0, 0%, 100%, 0.04)"
            }
            $textAlign="center"
            $padding="1rem"
          >
            <Text
              as="h3"
              $font={theme.typography.heading3.fontFamily}
              $size={theme.typography.heading3.fontSize}
              $weight={theme.typography.heading3.fontWeight}
              $color={theme.typography.heading3.color}
            >
              {t("Subscription canceled")}
            </Text>

            <Text
              as="p"
              $font={theme.typography.text.fontFamily}
              $size={0.8125 * theme.typography.text.fontSize}
              $weight={theme.typography.text.fontWeight}
              $color={theme.typography.text.color}
            >
              {billingSubscription?.cancelAt
                ? t("Access to plan will end on", {
                    date: toPrettyDate(
                      new Date(billingSubscription.cancelAt * 1000),
                      {
                        month: "numeric",
                      },
                    ),
                  })
                : ""}
            </Text>
          </Box>
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
            $flexWrap="wrap"
            $gap="1rem"
          >
            <Flex $flexDirection="column" $gap="1rem">
              <Text
                as={Box}
                $font={
                  theme.typography[props.header.title.fontStyle].fontFamily
                }
                $size={theme.typography[props.header.title.fontStyle].fontSize}
                $weight={
                  theme.typography[props.header.title.fontStyle].fontWeight
                }
                $color={theme.typography[props.header.title.fontStyle].color}
                $leading={1}
              >
                {currentPlan.name}
              </Text>

              {props.header.description.isVisible &&
                currentPlan.description && (
                  <Text
                    as={Box}
                    $font={
                      theme.typography[props.header.description.fontStyle]
                        .fontFamily
                    }
                    $size={
                      theme.typography[props.header.description.fontStyle]
                        .fontSize
                    }
                    $weight={
                      theme.typography[props.header.description.fontStyle]
                        .fontWeight
                    }
                    $color={
                      theme.typography[props.header.description.fontStyle].color
                    }
                  >
                    {currentPlan.description}
                  </Text>
                )}
            </Flex>

            {props.header.price.isVisible &&
              typeof currentPlan.planPrice === "number" &&
              currentPlan.planPeriod && (
                <Box>
                  <Text
                    $font={headerPriceFontStyle.fontFamily}
                    $size={headerPriceFontStyle.fontSize}
                    $weight={headerPriceFontStyle.fontWeight}
                    $color={headerPriceFontStyle.color}
                  >
                    {isUsageBasedPlan
                      ? t("Usage-based")
                      : formatCurrency(
                          currentPlan.planPrice,
                          subscriptionCurrency,
                        )}
                  </Text>

                  {!isUsageBasedPlan && (
                    <Text
                      $font={
                        theme.typography[props.header.price.fontStyle]
                          .fontFamily
                      }
                      $size={
                        theme.typography[props.header.price.fontStyle].fontSize
                      }
                      $weight={
                        theme.typography[props.header.price.fontStyle]
                          .fontWeight
                      }
                      $color={
                        theme.typography[props.header.price.fontStyle].color
                      }
                    >
                      <sub>/{shortenPeriod(currentPlan.planPeriod)}</sub>
                    </Text>
                  )}
                </Box>
              )}
          </Flex>
        )}

        {props.addOns.isVisible && addOns.length > 0 && (
          <Flex $flexDirection="column" $gap="1rem">
            {props.addOns.showLabel && (
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={
                  isLightBackground
                    ? darken(theme.card.background, 0.46)
                    : lighten(theme.card.background, 0.46)
                }
                $leading={1}
              >
                {t("Add-ons")}
              </Text>
            )}

            {addOns.map((addOn, addOnIndex) => (
              <Flex
                key={addOnIndex}
                $justifyContent="space-between"
                $alignItems="center"
                $flexWrap="wrap"
                $gap="1rem"
              >
                <Text
                  $font={theme.typography[props.addOns.fontStyle].fontFamily}
                  $size={theme.typography[props.addOns.fontStyle].fontSize}
                  $weight={theme.typography[props.addOns.fontStyle].fontWeight}
                  $color={theme.typography[props.addOns.fontStyle].color}
                >
                  {addOn.name}
                </Text>

                {addOn.planPrice && addOn.planPeriod && (
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {formatCurrency(addOn.planPrice, subscriptionCurrency)}
                    <sub>/{shortenPeriod(addOn.planPeriod)}</sub>
                  </Text>
                )}
              </Flex>
            ))}
          </Flex>
        )}

        {usageBasedEntitlements.length > 0 && (
          <Flex $flexDirection="column" $gap="1rem">
            <Text
              $font={theme.typography.text.fontFamily}
              $size={theme.typography.text.fontSize}
              $weight={theme.typography.text.fontWeight}
              $color={
                isLightBackground
                  ? darken(theme.card.background, 0.46)
                  : lighten(theme.card.background, 0.46)
              }
              $leading={1}
            >
              {t("Usage-based")}
            </Text>

            {usageBasedEntitlements.reduce(
              (acc: React.ReactElement[], entitlement, entitlementIndex) => {
                const limit =
                  entitlement.softLimit ?? entitlement.allocation ?? 0;
                const overageAmount =
                  entitlement.priceBehavior === "overage" &&
                  (entitlement?.usage ?? 0) - (entitlement?.softLimit ?? 0);
                const amount = overageAmount || entitlement.allocation || 0;

                if (entitlement.feature?.name) {
                  acc.push(
                    <Flex
                      key={entitlementIndex}
                      $justifyContent="space-between"
                      $alignItems="center"
                      $flexWrap="wrap"
                      $gap="1rem"
                    >
                      <Text
                        $font={
                          theme.typography[props.addOns.fontStyle].fontFamily
                        }
                        $size={
                          theme.typography[props.addOns.fontStyle].fontSize
                        }
                        $weight={
                          theme.typography[props.addOns.fontStyle].fontWeight
                        }
                        $color={theme.typography[props.addOns.fontStyle].color}
                      >
                        {entitlement.priceBehavior === "pay_in_advance" ||
                        (entitlement.priceBehavior === "overage" &&
                          limit > 0) ? (
                          <>
                            {limit} {getFeatureName(entitlement.feature, limit)}
                          </>
                        ) : (
                          entitlement.feature.name
                        )}
                        {entitlement.priceBehavior === "overage" &&
                          entitlement.feature.featureType === "event" &&
                          currentPlan?.planPeriod && (
                            <>/{shortenPeriod(currentPlan.planPeriod)}</>
                          )}
                      </Text>

                      <Flex $alignItems="center" $gap="1rem">
                        {entitlement.priceBehavior === "overage" &&
                        currentPlan?.planPeriod ? (
                          <Text
                            $font={theme.typography.text.fontFamily}
                            $size={0.875 * theme.typography.text.fontSize}
                            $weight={theme.typography.text.fontWeight}
                            $color={
                              hexToHSL(theme.typography.text.color).l > 50
                                ? darken(theme.typography.text.color, 0.46)
                                : lighten(theme.typography.text.color, 0.46)
                            }
                          >
                            {typeof overageAmount === "number" &&
                            overageAmount > 0 ? (
                              t("X over the limit", {
                                amount: overageAmount,
                              })
                            ) : (
                              <>
                                {t("Overage fee")}:{" "}
                                {formatCurrency(
                                  entitlement.price ?? 0,
                                  entitlement.currency,
                                )}
                                <sub>
                                  /{getFeatureName(entitlement.feature, 1)}
                                  {entitlement.feature.featureType ===
                                    "trait" && (
                                    <>
                                      /{shortenPeriod(currentPlan.planPeriod)}
                                    </>
                                  )}
                                </sub>
                              </>
                            )}
                          </Text>
                        ) : (
                          entitlement.priceBehavior === "pay_in_advance" &&
                          currentPlan?.planPeriod && (
                            <Text
                              $font={theme.typography.text.fontFamily}
                              $size={0.875 * theme.typography.text.fontSize}
                              $weight={theme.typography.text.fontWeight}
                              $color={
                                hexToHSL(theme.typography.text.color).l > 50
                                  ? darken(theme.typography.text.color, 0.46)
                                  : lighten(theme.typography.text.color, 0.46)
                              }
                            >
                              {formatCurrency(
                                entitlement.price ?? 0,
                                entitlement.currency,
                              )}
                              <sub>
                                /{getFeatureName(entitlement.feature, 1)}/
                                {shortenPeriod(currentPlan.planPeriod)}
                              </sub>
                            </Text>
                          )
                        )}

                        {amount > 0 && (
                          <Text
                            $font={theme.typography.text.fontFamily}
                            $size={theme.typography.text.fontSize}
                            $weight={theme.typography.text.fontWeight}
                            $color={theme.typography.text.color}
                          >
                            {formatCurrency(
                              (entitlement.price ?? 0) * amount,
                              entitlement.currency,
                            )}
                            {(entitlement.priceBehavior === "pay_in_advance" ||
                              entitlement.priceBehavior !== "overage") && (
                              <sub>
                                /
                                {currentPlan?.planPeriod &&
                                entitlement.priceBehavior === "pay_in_advance"
                                  ? shortenPeriod(currentPlan.planPeriod)
                                  : getFeatureName(entitlement.feature, 1)}
                              </sub>
                            )}
                          </Text>
                        )}
                      </Flex>
                    </Flex>,
                  );
                }

                return acc;
              },
              [],
            )}
          </Flex>
        )}

        {canCheckout && props.callToAction.isVisible && (
          <EmbedButton
            type="button"
            onClick={() => {
              setSelected({
                planId: currentPlan?.id,
                addOnId: undefined,
                usage: false,
              });
              setLayout("checkout");
            }}
            $size={props.callToAction.buttonSize}
            $color={props.callToAction.buttonStyle}
          >
            {t("Change plan")}
          </EmbedButton>
        )}
      </Element>
    </>
  );
});

PlanManager.displayName = "PlanManager";
