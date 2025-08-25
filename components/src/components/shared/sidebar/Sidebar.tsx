import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslation } from "react-i18next";

import {
  type PreviewSubscriptionFinanceResponseData,
  type UpdateAddOnRequestBody,
  type UpdateCreditBundleRequestBody,
  type UpdatePayInAdvanceRequestBody,
} from "../../../api/checkoutexternal";
import { PriceBehavior } from "../../../const";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import type {
  CreditBundle,
  CurrentUsageBasedEntitlement,
  SelectedPlan,
  UsageBasedEntitlement,
} from "../../../types";
import {
  ChargeType,
  formatCurrency,
  formatOrdinal,
  getAddOnPrice,
  getEntitlementPrice,
  getFeatureName,
  getMonthName,
  getPlanPrice,
  isCheckoutData,
  isHydratedPlan,
  shortenPeriod,
} from "../../../utils";
import { Box, Button, Flex, Icon, Text } from "../../ui";
import { type CheckoutStage } from "../checkout-dialog";

import { EntitlementRow } from "./EntitlementRow";
import { Proration } from "./Proration";
import { StageButton } from "./StageButton";

interface SidebarProps {
  planPeriod: string;
  selectedPlan?: SelectedPlan;
  addOns: SelectedPlan[];
  creditBundles?: CreditBundle[];
  usageBasedEntitlements: UsageBasedEntitlement[];
  addOnUsageBasedEntitlements?: UsageBasedEntitlement[];
  charges?: PreviewSubscriptionFinanceResponseData;
  checkoutRef?: React.RefObject<HTMLDivElement | null>;
  checkoutStage?: string;
  checkoutStages?: CheckoutStage[];
  error?: string;
  isLoading: boolean;
  isPaymentMethodRequired: boolean;
  paymentMethodId?: string;
  promoCode?: string | null;
  setCheckoutStage?: (stage: string) => void;
  setError: (msg?: string) => void;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  updatePromoCode?: (code: string | null) => void;
  showHeader?: boolean;
  shouldTrial?: boolean;
  willTrialWithoutPaymentMethod?: boolean;
}

export const Sidebar = ({
  planPeriod,
  selectedPlan,
  addOns,
  creditBundles = [],
  usageBasedEntitlements,
  addOnUsageBasedEntitlements = [],
  charges,
  checkoutRef,
  checkoutStage,
  checkoutStages,
  error,
  isLoading,
  isPaymentMethodRequired,
  paymentMethodId,
  promoCode,
  setCheckoutStage,
  setError,
  setIsLoading,
  updatePromoCode,
  showHeader = true,
  shouldTrial = false,
  willTrialWithoutPaymentMethod = false,
}: SidebarProps) => {
  const { t } = useTranslation();

  const { data, settings, layout, setLayout, checkout, unsubscribe } =
    useEmbed();

  const isLightBackground = useIsLightBackground();

  const {
    currentPlan,
    currentAddOns,
    currentEntitlements,
    currentUsageBasedEntitlements,
    billingSubscription,
    paymentMethod,
    trialPaymentMethodRequired,
  } = useMemo(() => {
    if (isCheckoutData(data)) {
      const currentEntitlements = data.featureUsage?.features || [];

      return {
        currentPlan: data.company?.plan,
        currentAddOns: data.company?.addOns || [],
        currentEntitlements,
        currentUsageBasedEntitlements: currentEntitlements.reduce(
          (acc: CurrentUsageBasedEntitlement[], entitlement) => {
            if (
              entitlement.priceBehavior &&
              ((planPeriod === "month" && entitlement.monthlyUsageBasedPrice) ||
                (planPeriod === "year" && entitlement.yearlyUsageBasedPrice))
            ) {
              const allocation = entitlement.allocation || 0;
              const usage = entitlement.usage || 0;

              acc.push({
                ...entitlement,
                allocation,
                usage,
                quantity: allocation ?? usage,
              });
            }

            return acc;
          },
          [],
        ),
        billingSubscription: data.company?.billingSubscription,
        paymentMethod: data.subscription?.paymentMethod,
        trialPaymentMethodRequired: data.trialPaymentMethodRequired === true,
      };
    }

    return {
      currentPlan: undefined,
      currentAddOns: [],
      currentEntitlements: [],
      currentUsageBasedEntitlements: [],
      billingSubscription: undefined,
      paymentMethod: undefined,
      trialPaymentMethodRequired: false,
    };
  }, [data, planPeriod]);

  const { payInAdvanceEntitlements } = useMemo(() => {
    const payAsYouGoEntitlements: UsageBasedEntitlement[] = [];
    const payInAdvanceEntitlements = usageBasedEntitlements.filter(
      (entitlement) => {
        if (entitlement.priceBehavior === PriceBehavior.PayAsYouGo) {
          payAsYouGoEntitlements.push(entitlement);
        }

        return entitlement.priceBehavior === PriceBehavior.PayInAdvance;
      },
    );

    return { payAsYouGoEntitlements, payInAdvanceEntitlements };
  }, [usageBasedEntitlements]);

  const subscriptionPrice = useMemo(() => {
    let planPrice: number | undefined;
    let currency: string | undefined;

    if (selectedPlan) {
      const planBillingPrice = getPlanPrice(selectedPlan, planPeriod);

      planPrice = planBillingPrice?.price;
      currency = planBillingPrice?.currency;
    } else if (typeof currentPlan?.planPrice === "number") {
      planPrice = currentPlan.planPrice;
    }

    let total = 0;

    if (planPrice) {
      total += planPrice;
    }

    const addOnCost = addOns.reduce((sum, addOn) => {
      if (addOn.isSelected) {
        sum += getAddOnPrice(addOn, planPeriod)?.price ?? 0;
      }

      return sum;
    }, 0);
    total += addOnCost;

    const payInAdvanceCost = payInAdvanceEntitlements.reduce(
      (sum, entitlement) =>
        sum +
        entitlement.quantity *
          (getEntitlementPrice(entitlement, planPeriod)?.price ?? 0),
      0,
    );
    total += payInAdvanceCost;

    return formatCurrency(total, currency);
  }, [selectedPlan, currentPlan, planPeriod, addOns, payInAdvanceEntitlements]);

  const { amountOff, dueNow, newCharges, percentOff, periodStart, proration } =
    useMemo(() => {
      return {
        amountOff: charges?.amountOff ?? 0,
        dueNow: charges?.dueNow ?? 0,
        newCharges: charges?.newCharges ?? 0,
        percentOff: charges?.percentOff ?? 0,
        periodStart: charges?.periodStart,
        proration: charges?.proration ?? 0,
      };
    }, [charges]);

  const updatedUsageBasedEntitlements = useMemo(() => {
    const changedUsageBasedEntitlements: {
      previous: CurrentUsageBasedEntitlement;
      next: UsageBasedEntitlement;
    }[] = [];
    const addedUsageBasedEntitlements = selectedPlan
      ? usageBasedEntitlements.reduce(
          (acc: UsageBasedEntitlement[], selected) => {
            const changed = currentUsageBasedEntitlements.find(
              (current) =>
                current.entitlementId === selected.id &&
                current.quantity !== selected.quantity,
            );

            if (changed) {
              changedUsageBasedEntitlements.push({
                previous: changed,
                next: selected,
              });
            } else {
              acc.push(selected);
            }

            return acc;
          },
          [],
        )
      : [];

    const removedUsageBasedEntitlements = selectedPlan
      ? currentUsageBasedEntitlements.reduce(
          (acc: CurrentUsageBasedEntitlement[], current) => {
            const match =
              usageBasedEntitlements.every(
                (entitlement) => entitlement.id !== current.entitlementId,
              ) &&
              currentEntitlements.find(
                (usage) => usage.entitlementId === current.entitlementId,
              );
            if (match) {
              acc.push({
                ...match,
                allocation: current.allocation,
                usage: current.usage,
                quantity: current.quantity,
              });
            }

            return acc;
          },
          [],
        )
      : [];

    const willUsageBasedEntitlementsChange =
      changedUsageBasedEntitlements.length > 0 ||
      addedUsageBasedEntitlements.length > 0 ||
      removedUsageBasedEntitlements.length > 0;

    return {
      changed: changedUsageBasedEntitlements,
      added: addedUsageBasedEntitlements,
      removed: removedUsageBasedEntitlements,
      willChange: willUsageBasedEntitlementsChange,
    };
  }, [
    selectedPlan,
    currentEntitlements,
    currentUsageBasedEntitlements,
    usageBasedEntitlements,
  ]);

  const selectedAddOns = useMemo(
    () => addOns.filter((addOn) => addOn.isSelected),
    [addOns],
  );

  const addedCreditBundles = useMemo(
    () => creditBundles.filter((bundle) => bundle.count > 0),
    [creditBundles],
  );

  const handleCheckout = useCallback(async () => {
    const planId = selectedPlan?.id;
    const priceId = (
      planPeriod === "year"
        ? selectedPlan?.yearlyPrice
        : selectedPlan?.monthlyPrice
    )?.id;

    try {
      if (!planId || !priceId) {
        throw new Error(t("Selected plan or associated price is missing."));
      }

      setError(undefined);
      setIsLoading(true);

      const planPayInAdvance = payInAdvanceEntitlements.reduce(
        (
          acc: UpdatePayInAdvanceRequestBody[],
          { meteredMonthlyPrice, meteredYearlyPrice, quantity },
        ) => {
          const priceId = (
            planPeriod === "year" ? meteredYearlyPrice : meteredMonthlyPrice
          )?.priceId;

          if (priceId) {
            acc.push({
              priceId,
              quantity,
            });
          }

          return acc;
        },
        [],
      );

      const addOnPayInAdvance = addOnUsageBasedEntitlements
        .filter(
          (entitlement) =>
            entitlement.priceBehavior === PriceBehavior.PayInAdvance,
        )
        .reduce(
          (
            acc: UpdatePayInAdvanceRequestBody[],
            { meteredMonthlyPrice, meteredYearlyPrice, quantity },
          ) => {
            const priceId = (
              planPeriod === "year" ? meteredYearlyPrice : meteredMonthlyPrice
            )?.priceId;

            if (priceId) {
              acc.push({
                priceId,
                quantity,
              });
            }

            return acc;
          },
          [],
        );

      const allPayInAdvance = [...planPayInAdvance, ...addOnPayInAdvance];

      await checkout({
        newPlanId: planId,
        newPriceId: priceId,
        addOnIds: addOns.reduce((acc: UpdateAddOnRequestBody[], addOn) => {
          if (
            addOn.isSelected &&
            isHydratedPlan(selectedPlan) &&
            !selectedPlan.companyCanTrial
          ) {
            const addOnPriceId = getAddOnPrice(addOn, planPeriod)?.id;

            if (addOnPriceId) {
              acc.push({
                addOnId: addOn.id,
                priceId: addOnPriceId,
              });
            }
          }

          return acc;
        }, []),
        payInAdvance: allPayInAdvance,
        creditBundles: creditBundles.reduce(
          (acc: UpdateCreditBundleRequestBody[], { id, count }) => {
            if (count > 0) {
              acc.push({
                bundleId: id,
                quantity: count,
              });
            }

            return acc;
          },
          [],
        ),
        skipTrial: !willTrialWithoutPaymentMethod,
        ...(paymentMethodId && { paymentMethodId }),
        ...(promoCode && { promoCode }),
      });

      setIsLoading(false);
      setLayout("portal");
    } catch {
      setIsLoading(false);
      setLayout("checkout");
      setError(
        t("Error processing payment. Please try a different payment method."),
      );
    }
  }, [
    t,
    checkout,
    paymentMethodId,
    planPeriod,
    selectedPlan,
    addOns,
    creditBundles,
    setError,
    setIsLoading,
    setLayout,
    payInAdvanceEntitlements,
    addOnUsageBasedEntitlements,
    willTrialWithoutPaymentMethod,
    promoCode,
  ]);

  const handleUnsubscribe = useCallback(async () => {
    try {
      setError(undefined);
      setIsLoading(true);

      await unsubscribe();

      setIsLoading(false);
      setLayout("portal");
    } catch {
      setIsLoading(false);
      setLayout("unsubscribe");
      setError(t("Unsubscribe failed"));
    }
  }, [t, unsubscribe, setError, setIsLoading, setLayout]);

  const willPlanChange = isHydratedPlan(selectedPlan) && !selectedPlan.current;

  const { removedAddOns, willAddOnsChange } = useMemo(() => {
    const addedAddOns = selectedAddOns.filter(
      (selected) =>
        !currentAddOns.some((current) => selected.id === current.id),
    );

    const removedAddOns = currentAddOns.filter(
      (current) =>
        !selectedAddOns.some((selected) => current.id === selected.id) &&
        current.planPeriod !== "one-time",
    );

    const willAddOnsChange = removedAddOns.length > 0 || addedAddOns.length > 0;

    return {
      addedAddOns,
      removedAddOns,
      willAddOnsChange,
    };
  }, [currentAddOns, selectedAddOns]);

  const isSelectedPlanTrialable =
    isHydratedPlan(selectedPlan) &&
    selectedPlan?.companyCanTrial === true &&
    selectedPlan?.isTrialable === true;
  const now = new Date();
  const trialEndsOn = new Date(now);
  if (isSelectedPlanTrialable && selectedPlan.trialDays) {
    trialEndsOn.setDate(trialEndsOn.getDate() + selectedPlan.trialDays);
  }

  const { price: selectedPlanPrice, currency: selectedPlanCurrency } =
    selectedPlan ? getPlanPrice(selectedPlan, planPeriod) || {} : {};

  return (
    <Flex
      ref={checkoutRef}
      $flexDirection="column"
      $flexShrink={0}
      $overflow="auto"
      $backgroundColor={settings.theme.card.background}
      $borderRadius="0 0 0.5rem"
      $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
      $viewport={{
        md: {
          $width: "21.5rem",
        },
      }}
    >
      {showHeader && (
        <Flex
          $position="relative"
          $flexDirection="column"
          $gap="1rem"
          $width="100%"
          $padding="1.5rem"
          $borderWidth="0"
          $borderBottomWidth="1px"
          $borderStyle="solid"
          $borderColor={
            isLightBackground
              ? "hsla(0, 0%, 0%, 0.1)"
              : "hsla(0, 0%, 100%, 0.2)"
          }
        >
          <Flex $justifyContent="space-between">
            <Text as="h3" display="heading3">
              {t("Subscription")}
            </Text>
          </Flex>
        </Flex>
      )}

      <Flex
        $position="relative"
        $flexDirection="column"
        $gap="0.125rem"
        $flexGrow="1"
        $width="100%"
        $padding="1.5rem"
        $borderWidth="0"
        $borderBottomWidth="1px"
        $borderStyle="solid"
        $borderColor={
          isLightBackground ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 100%, 0.2)"
        }
      >
        <Box $opacity="0.625">
          <Text $size={14}>{t("Plan")}</Text>
        </Box>

        <Flex $flexDirection="column" $gap="0.5rem" $marginBottom="1.5rem">
          {currentPlan && (
            <Flex
              $justifyContent="space-between"
              $alignItems="center"
              $gap="1rem"
              {...(willPlanChange && {
                $opacity: "0.625",
                $textDecoration: "line-through",
                $color: settings.theme.typography.heading4.color,
              })}
            >
              <Box>
                <Text display="heading4">{currentPlan.name}</Text>
              </Box>

              {typeof currentPlan.planPrice === "number" && (
                <Box $whiteSpace="nowrap">
                  <Text>
                    {formatCurrency(
                      currentPlan.planPrice,
                      billingSubscription?.currency,
                    )}
                    <sub>
                      /{shortenPeriod(currentPlan.planPeriod || planPeriod)}
                    </sub>
                  </Text>
                </Box>
              )}
            </Flex>
          )}

          {willPlanChange && (
            <Box>
              <Box
                $width="100%"
                $textAlign="left"
                $opacity="50%"
                $marginBottom="0.25rem"
                $marginTop="-0.25rem"
              >
                <Icon
                  name="arrow-down"
                  color={settings.theme.typography.text.color}
                  style={{
                    display: "inline-flex",
                  }}
                />
              </Box>

              <Flex
                $justifyContent="space-between"
                $alignItems="center"
                $gap="1rem"
              >
                <Flex>
                  <Text display="heading4">{selectedPlan.name}</Text>
                </Flex>

                <Flex $whiteSpace="nowrap">
                  <Text>
                    {formatCurrency(
                      selectedPlanPrice ?? 0,
                      selectedPlanCurrency,
                    )}
                    <sub>/{shortenPeriod(planPeriod)}</sub>
                  </Text>
                </Flex>
              </Flex>
            </Box>
          )}
        </Flex>

        {updatedUsageBasedEntitlements.willChange && (
          <Flex $flexDirection="column" $gap="0.5rem" $marginBottom="1.5rem">
            <Box $opacity="0.625">
              <Text $size={14}>{t("Usage-based")}</Text>
            </Box>

            {updatedUsageBasedEntitlements.removed.reduce(
              (acc: React.ReactElement[], entitlement, index) => {
                if (entitlement.feature?.name) {
                  acc.push(
                    <Flex
                      key={index}
                      $justifyContent="space-between"
                      $alignItems="baseline"
                      $gap="1rem"
                      $opacity="0.625"
                      $textDecoration="line-through"
                      $color={settings.theme.typography.heading4.color}
                    >
                      <EntitlementRow
                        {...entitlement}
                        planPeriod={planPeriod}
                      />
                    </Flex>,
                  );
                }

                return acc;
              },
              [],
            )}

            {updatedUsageBasedEntitlements.changed.reduce(
              (acc: React.ReactElement[], { previous, next }, index) => {
                if (next.feature?.name) {
                  acc.push(
                    <Box key={index}>
                      <Flex
                        $justifyContent="space-between"
                        $alignItems="baseline"
                        $gap="1rem"
                        $opacity="0.625"
                        $textDecoration="line-through"
                        $color={settings.theme.typography.heading4.color}
                      >
                        <EntitlementRow {...previous} planPeriod={planPeriod} />
                      </Flex>

                      <Flex
                        $justifyContent="space-between"
                        $alignItems="baseline"
                        $gap="1rem"
                      >
                        <EntitlementRow {...next} planPeriod={planPeriod} />
                      </Flex>
                    </Box>,
                  );
                }

                return acc;
              },
              [],
            )}

            {updatedUsageBasedEntitlements.added.reduce(
              (acc: React.ReactElement[], entitlement, index) => {
                if (entitlement.feature?.name) {
                  acc.push(
                    <Flex
                      key={index}
                      $justifyContent="space-between"
                      $alignItems="baseline"
                      $gap="1rem"
                    >
                      <EntitlementRow
                        {...entitlement}
                        planPeriod={planPeriod}
                      />
                    </Flex>,
                  );
                }

                return acc;
              },
              [],
            )}
          </Flex>
        )}

        {selectedPlan && isSelectedPlanTrialable && shouldTrial && (
          <Box>
            <Box $opacity="0.625">
              <Text $size={14}>{t("Trial")}</Text>
            </Box>
            <Flex
              $justifyContent="space-between"
              $alignItems="center"
              $gap="1rem"
            >
              <Flex>
                <Text display="heading4">
                  {t("Ends on", { date: trialEndsOn.toLocaleDateString() })}
                </Text>
              </Flex>
              <Flex>
                <Text>
                  -
                  {formatCurrency(selectedPlanPrice ?? 0, selectedPlanCurrency)}
                  /<sub>{shortenPeriod(planPeriod)}</sub>
                </Text>
              </Flex>
            </Flex>
          </Box>
        )}

        {(willAddOnsChange || selectedAddOns.length > 0) && (
          <Flex $flexDirection="column" $gap="0.5rem" $marginBottom="1.5rem">
            <Box $opacity="0.625">
              <Text $size={14}>{t("Add-ons")}</Text>
            </Box>

            {removedAddOns.map((addOn, index) => {
              return (
                <Flex
                  key={index}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                  $opacity="0.625"
                  $textDecoration="line-through"
                  $color={settings.theme.typography.heading4.color}
                >
                  <Box>
                    <Text display="heading4">{addOn.name}</Text>
                  </Box>

                  {typeof addOn.planPrice === "number" && addOn.planPeriod && (
                    <Box $whiteSpace="nowrap">
                      <Text>
                        {formatCurrency(addOn.planPrice, selectedPlanCurrency)}
                        {addOn.planPeriod !== "one-time" && (
                          <sub>/{shortenPeriod(planPeriod)}</sub>
                        )}
                      </Text>
                    </Box>
                  )}
                </Flex>
              );
            })}

            {selectedAddOns.map((addOn, index) => {
              const { price: addOnPrice, currency: addOnCurrency } =
                getAddOnPrice(addOn, planPeriod) || {};

              return (
                <Flex
                  key={index}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                >
                  <Box>
                    <Text display="heading4">{addOn.name}</Text>
                  </Box>

                  <Box $whiteSpace="nowrap">
                    <Text>
                      {formatCurrency(addOnPrice ?? 0, addOnCurrency)}
                      {addOn.chargeType !== ChargeType.oneTime && (
                        <sub>/{shortenPeriod(planPeriod)}</sub>
                      )}
                    </Text>
                  </Box>
                </Flex>
              );
            })}
          </Flex>
        )}

        {addedCreditBundles.length > 0 && (
          <Flex $flexDirection="column" $gap="0.5rem" $marginBottom="1.5rem">
            <Box $opacity="0.625">
              <Text $size={14}>{t("Credits")}</Text>
            </Box>

            {addedCreditBundles.reduce(
              (acc: React.ReactNode[], bundle, index) => {
                const price =
                  typeof bundle.price?.priceDecimal === "string"
                    ? Number(bundle.price.priceDecimal)
                    : typeof bundle.price?.price === "number"
                      ? bundle.price.price
                      : undefined;

                const amount = (bundle.quantity ?? 0) * bundle.count;

                if (price)
                  acc.push(
                    <Flex
                      key={index}
                      $justifyContent="space-between"
                      $alignItems="center"
                      $gap="1rem"
                    >
                      <Box>
                        <Box>
                          <Text display="heading4">
                            {bundle.name} ({bundle.count})
                          </Text>
                        </Box>

                        <Box>
                          <Text>
                            {amount} {getFeatureName(bundle, amount)}
                          </Text>
                        </Box>
                      </Box>

                      {bundle.count > 0 && (
                        <Box $whiteSpace="nowrap">
                          <Text>
                            {formatCurrency(
                              price * bundle.count,
                              bundle.price?.currency,
                            )}
                          </Text>
                        </Box>
                      )}
                    </Flex>,
                  );

                return acc;
              },
              [],
            )}
          </Flex>
        )}

        {proration !== 0 && charges && selectedPlanCurrency && (
          <Proration
            charges={charges}
            currency={selectedPlanCurrency}
            selectedPlan={selectedPlan}
          />
        )}
      </Flex>

      <Flex
        $flexDirection="column"
        $position="relative"
        $gap="1rem"
        $width="100%"
        $padding="1.5rem"
      >
        {promoCode && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Box $opacity="0.625">
              <Text>{t("Discount")}</Text>
            </Box>

            <Flex
              $alignItems="center"
              $padding="0 0.375rem"
              $outlineWidth="1px"
              $outlineStyle="solid"
              $outlineColor={
                isLightBackground
                  ? "hsla(0, 0%, 0%, 0.15)"
                  : "hsla(0, 0%, 100%, 0.15)"
              }
              $borderRadius="0.3125rem"
            >
              <Text $size={0.75 * settings.theme.typography.text.fontSize}>
                {promoCode}
              </Text>

              <Box
                $cursor="pointer"
                onClick={() => {
                  updatePromoCode?.(null);
                }}
              >
                <Icon
                  name="close"
                  size="tn"
                  color={
                    isLightBackground ? "hsl(0, 0%, 0%)" : "hsl(0, 0%, 100%)"
                  }
                />
              </Box>
            </Flex>
          </Flex>
        )}

        {percentOff > 0 && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Box $opacity="0.625" $lineHeight={1.15}>
              <Text>{t("X% off", { percent: percentOff })}</Text>
            </Box>

            <Box>
              <Text>
                {formatCurrency(
                  (newCharges / 100) * percentOff,
                  selectedPlanCurrency,
                )}
              </Text>
            </Box>
          </Flex>
        )}

        {amountOff > 0 && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Box $opacity="0.625" $lineHeight={1.15}>
              <Text>
                {t("X off", {
                  amount: formatCurrency(
                    Math.abs(amountOff),
                    selectedPlanCurrency,
                  ),
                })}
              </Text>
            </Box>

            <Box>
              <Text>
                -{formatCurrency(Math.abs(amountOff), selectedPlanCurrency)}
              </Text>
            </Box>
          </Flex>
        )}

        {subscriptionPrice && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Box $opacity="0.625">
              <Text>
                {planPeriod === "year" ? t("Yearly total") : t("Monthly total")}
                :
              </Text>
            </Box>

            <Box $whiteSpace="nowrap">
              <Text>
                {subscriptionPrice}
                <sub>/{shortenPeriod(planPeriod)}</sub>
              </Text>
            </Box>
          </Flex>
        )}

        {charges && (
          <Flex
            $justifyContent="space-between"
            $alignItems="center"
            $gap="1rem"
          >
            <Box $opacity="0.625">
              <Text>{t("Due today")}:</Text>
            </Box>

            <Box>
              <Text>
                {formatCurrency(Math.max(0, dueNow), selectedPlanCurrency)}
              </Text>
            </Box>
          </Flex>
        )}

        {dueNow < 0 && (
          <Flex $justifyContent="space-between" $gap="1rem">
            <Box $opacity="0.625" $lineHeight={1.15}>
              <Text>{t("Credits to be applied to future invoices")}:</Text>
            </Box>

            <Box>
              <Text>
                {formatCurrency(Math.abs(dueNow), selectedPlanCurrency)}
              </Text>
            </Box>
          </Flex>
        )}

        {layout === "checkout" && (
          <StageButton
            checkout={handleCheckout}
            checkoutStage={checkoutStage}
            checkoutStages={checkoutStages}
            hasAddOns={addOns.length > 0}
            hasPayInAdvanceEntitlements={payInAdvanceEntitlements.length > 0}
            hasCreditBundles={creditBundles.length > 0}
            hasPaymentMethod={
              typeof paymentMethod !== "undefined" ||
              typeof paymentMethodId === "string"
            }
            hasPlan={typeof selectedPlan !== "undefined"}
            inEditMode={settings.mode === "edit"}
            isLoading={isLoading}
            isPaymentMethodRequired={isPaymentMethodRequired}
            isSelectedPlanTrialable={isSelectedPlanTrialable}
            setCheckoutStage={setCheckoutStage}
            trialPaymentMethodRequired={trialPaymentMethodRequired}
            shouldTrial={shouldTrial}
            willTrialWithoutPaymentMethod={willTrialWithoutPaymentMethod}
          />
        )}

        {layout === "unsubscribe" && (
          <Button
            type="button"
            onClick={handleUnsubscribe}
            $isLoading={isLoading}
            $fullWidth
          >
            {t("Cancel subscription")}
          </Button>
        )}

        {!isLoading && error && (
          <Box>
            <Text $weight={500} $color="#DB6669">
              {error}
            </Text>
          </Box>
        )}

        {layout !== "unsubscribe" && (
          <Box $opacity="0.625">
            <Text>
              {subscriptionPrice &&
                // TODO: localize
                `You will be billed ${subscriptionPrice} ${usageBasedEntitlements.length > 0 ? "plus usage based costs" : ""} for this subscription
                every ${planPeriod} ${periodStart ? `on the ${formatOrdinal(periodStart.getDate())}` : ""} ${planPeriod === "year" && periodStart ? `of ${getMonthName(periodStart)}` : ""} unless you unsubscribe.`}
            </Text>
          </Box>
        )}
      </Flex>
    </Flex>
  );
};
