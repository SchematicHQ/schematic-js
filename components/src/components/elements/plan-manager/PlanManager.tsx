import { forwardRef, useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type FontStyle } from "../../../context";
import { useEmbed, useIsLightBackground, useTrialEnd } from "../../../hooks";
import type { ElementProps, RecursivePartial } from "../../../types";
import {
  darken,
  formatCurrency,
  getBillingPrice,
  getFeatureName,
  getUsageCost,
  hexToHSL,
  isCheckoutData,
  lighten,
  shortenPeriod,
  toPrettyDate,
} from "../../../utils";
import { Element, Notice } from "../../layout";
import { Box, Button, Flex, Text } from "../../ui";

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

  const { t } = useTranslation();

  const { data, settings, setCheckoutState } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const trialEndDays = useTrialEnd();

  /**
   * Can change plan if there is:
   * - a publishable key
   * - a current plan with a billing association
   * - any active plans
   */
  const {
    currentPlan,
    currentAddOns,
    billingSubscription,
    canCheckout,
    defaultPlan,
    featureUsage,
    trialPaymentMethodRequired,
  } = useMemo(() => {
    if (isCheckoutData(data)) {
      return {
        currentPlan: data.company?.plan,
        currentAddOns: data.company?.addOns || [],
        billingSubscription: data.company?.billingSubscription,
        canCheckout: data.capabilities?.checkout ?? true,
        defaultPlan: data.defaultPlan,
        featureUsage: data.featureUsage?.features || [],
        trialPaymentMethodRequired: data.trialPaymentMethodRequired,
      };
    }

    return {
      currentPlan: undefined,
      currentAddOns: [],
      billingSubscription: undefined,
      canCheckout: false,
      defaultPlan: undefined,
      featureUsage: [],
      trialPaymentMethodRequired: false,
    };
  }, [data]);

  /* const usageBasedEntitlements = useMemo(
    () =>
      featureUsage.reduce(
        (
          acc: (FeatureUsageResponseData & {
            billingPrice?: BillingPriceView;
          })[],
          usage,
        ) => {
          const billingPrice = getBillingPrice(
            currentPlan?.planPeriod === "year"
              ? usage.yearlyUsageBasedPrice
              : usage.monthlyUsageBasedPrice,
          );

          if (usage.priceBehavior) {
            acc.push({ ...usage, billingPrice });
          }

          return acc;
        },
        [],
      ),
    [currentPlan?.planPeriod, featureUsage],
  ); */

  const usageBasedEntitlements = useMemo(
    () => featureUsage.filter((usage) => !!usage.priceBehavior),
    [featureUsage],
  );

  const { subscriptionCurrency, willSubscriptionCancel, isTrialSubscription } =
    useMemo(() => {
      const subscriptionCurrency = billingSubscription?.currency;
      const isTrialSubscription = billingSubscription?.status === "trialing";
      const willSubscriptionCancel = billingSubscription?.cancelAtPeriodEnd;

      return {
        subscriptionCurrency,
        willSubscriptionCancel,
        isTrialSubscription,
      };
    }, [billingSubscription]);

  const isUsageBasedPlan =
    currentPlan?.planPrice === 0 && usageBasedEntitlements.length > 0;

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
          {trialEndDays && (
            <Text as="h3" display="heading3">
              {t("Trial ends in", { days: trialEndDays })}
            </Text>
          )}

          <Text as="p" $size={0.8125 * settings.theme.typography.text.fontSize}>
            {trialPaymentMethodRequired
              ? t("After the trial, subscribe")
              : defaultPlan
                ? t("After the trial, cancel", {
                    defaultPlanName: defaultPlan?.name,
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

            {billingSubscription?.cancelAt && (
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
            $flexWrap="wrap"
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
                      : formatCurrency(
                          currentPlan.planPrice,
                          subscriptionCurrency,
                        )}
                  </Text>

                  {!isUsageBasedPlan && (
                    <Text display={props.header.price.fontStyle}>
                      <sub>/{shortenPeriod(currentPlan.planPeriod)}</sub>
                    </Text>
                  )}
                </Box>
              )}
          </Flex>
        )}

        {props.addOns.isVisible && currentAddOns.length > 0 && (
          <Flex $flexDirection="column" $gap="1rem">
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

            {currentAddOns.map((addOn, addOnIndex) => (
              <Flex
                key={addOnIndex}
                $justifyContent="space-between"
                $alignItems="center"
                $flexWrap="wrap"
                $gap="1rem"
              >
                <Text display={props.addOns.fontStyle}>{addOn.name}</Text>

                {addOn.planPrice && addOn.planPeriod && (
                  <Text>
                    {formatCurrency(addOn.planPrice, subscriptionCurrency)}
                    <sub>
                      {addOn.planPeriod == "one-time"
                        ? shortenPeriod(addOn.planPeriod)
                        : `/${shortenPeriod(addOn.planPeriod)}`}
                    </sub>
                  </Text>
                )}
              </Flex>
            ))}
          </Flex>
        )}

        {usageBasedEntitlements.length > 0 && (
          <Flex $flexDirection="column" $gap="1rem">
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

            {usageBasedEntitlements.reduce(
              (acc: React.ReactElement[], entitlement, entitlementIndex) => {
                const limit =
                  entitlement.softLimit ?? entitlement.allocation ?? 0;
                const billingPrice = getBillingPrice(
                  currentPlan?.planPeriod === "year"
                    ? entitlement.yearlyUsageBasedPrice
                    : entitlement.monthlyUsageBasedPrice,
                );
                const cost = getUsageCost({
                  usage: entitlement.usage,
                  billingPrice,
                });
                const packageSize = billingPrice?.packageSize ?? 1;

                let overageAmount =
                  entitlement.priceBehavior === "overage"
                    ? (entitlement?.usage ?? 0) - (entitlement?.softLimit ?? 0)
                    : undefined;

                // calculate overage amount
                if (
                  entitlement.priceBehavior === "overage" &&
                  billingPrice?.priceTier.length
                ) {
                  overageAmount =
                    (entitlement?.usage ?? 0) -
                    (billingPrice.priceTier[0].upTo ?? 0);
                }

                let amount = 0;
                if (entitlement.priceBehavior === "overage" && overageAmount) {
                  amount = overageAmount;
                } else if (
                  entitlement.priceBehavior === "pay_as_you_go" &&
                  entitlement.usage
                ) {
                  amount = entitlement.usage;
                } else if (
                  entitlement.priceBehavior === "pay_in_advance" &&
                  entitlement.allocation
                ) {
                  amount = entitlement.allocation;
                }

                if (entitlement.feature?.name) {
                  acc.push(
                    <Flex
                      key={entitlementIndex}
                      $justifyContent="space-between"
                      $alignItems="center"
                      $flexWrap="wrap"
                      $gap="1rem"
                    >
                      <Text display={props.addOns.fontStyle}>
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
                            $size={
                              0.875 * settings.theme.typography.text.fontSize
                            }
                            $color={
                              hexToHSL(settings.theme.typography.text.color).l >
                              50
                                ? darken(
                                    settings.theme.typography.text.color,
                                    0.46,
                                  )
                                : lighten(
                                    settings.theme.typography.text.color,
                                    0.46,
                                  )
                            }
                          >
                            {typeof overageAmount === "number" &&
                            overageAmount > 0 ? (
                              t("X additional", {
                                amount: overageAmount,
                              })
                            ) : (
                              <>
                                {t("Additional")}:{" "}
                                {formatCurrency(
                                  cost ?? 0,
                                  billingPrice?.currency,
                                )}
                                <sub>
                                  /{packageSize > 1 && <>{packageSize} </>}
                                  {getFeatureName(
                                    entitlement.feature,
                                    packageSize,
                                  )}
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
                          currentPlan?.planPeriod && (
                            <Text
                              $size={
                                0.875 * settings.theme.typography.text.fontSize
                              }
                              $color={
                                hexToHSL(settings.theme.typography.text.color)
                                  .l > 50
                                  ? darken(
                                      settings.theme.typography.text.color,
                                      0.46,
                                    )
                                  : lighten(
                                      settings.theme.typography.text.color,
                                      0.46,
                                    )
                              }
                            >
                              {formatCurrency(
                                cost ?? 0,
                                billingPrice?.currency,
                              )}
                              <sub>
                                /{packageSize > 1 && <>{packageSize} </>}
                                {getFeatureName(
                                  entitlement.feature,
                                  packageSize,
                                )}
                                {entitlement.feature.featureType ===
                                  "trait" && (
                                  <>/{shortenPeriod(currentPlan.planPeriod)}</>
                                )}
                              </sub>
                            </Text>
                          )
                        )}

                        {amount > 0 && (
                          <Text>
                            {formatCurrency(
                              (cost ?? 0) * amount,
                              billingPrice?.currency,
                            )}
                            {entitlement.priceBehavior !== "overage" &&
                              entitlement.feature.featureType === "trait" && (
                                <sub>
                                  /
                                  {currentPlan?.planPeriod &&
                                  entitlement.priceBehavior ===
                                    "pay_in_advance" ? (
                                    shortenPeriod(currentPlan.planPeriod)
                                  ) : (
                                    <>
                                      {packageSize > 1 && <>{packageSize} </>}
                                      {getFeatureName(
                                        entitlement.feature,
                                        packageSize,
                                      )}
                                    </>
                                  )}
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
