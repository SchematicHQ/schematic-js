import {
  type Dispatch,
  type SetStateAction,
  useCallback,
  useMemo,
} from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import type {
  FeatureUsageResponseData,
  PlanEntitlementResponseData,
  PreviewSubscriptionFinanceResponseData,
  UpdateAddOnRequestBody,
  UpdatePayInAdvanceRequestBody,
} from "../../../api";
import {
  type SelectedPlan,
  useEmbed,
  useIsLightBackground,
} from "../../../hooks";
import {
  ChargeType,
  formatCurrency,
  formatOrdinal,
  getAddOnPrice,
  getBillingPrice,
  getFeatureName,
  getMonthName,
  shortenPeriod,
} from "../../../utils";
import { Box, Button, Flex, Icon, Text } from "../../ui";
import { type CheckoutStage } from "../checkout-dialog";
import { StageButton } from "./StageButton";

export interface UsageBasedEntitlement extends PlanEntitlementResponseData {
  allocation: number;
  usage: number;
  quantity: number;
}

export interface CurrentUsageBasedEntitlement extends FeatureUsageResponseData {
  allocation: number;
  usage: number;
  quantity: number;
}

interface SidebarProps {
  planPeriod: string;
  selectedPlan?: SelectedPlan;
  addOns: SelectedPlan[];
  usageBasedEntitlements: UsageBasedEntitlement[];
  charges?: PreviewSubscriptionFinanceResponseData;
  checkoutRef?: React.RefObject<HTMLDivElement | null>;
  checkoutStage?: string;
  checkoutStages?: CheckoutStage[];
  error?: string;
  isLoading: boolean;
  paymentMethodId?: string;
  promoCode?: string;
  requiresPayment: boolean;
  setCheckoutStage?: (stage: string) => void;
  setError: (msg?: string) => void;
  setIsLoading: Dispatch<SetStateAction<boolean>>;
  updatePromoCode?: (code?: string) => void;
  showHeader?: boolean;
}

export const Sidebar = ({
  planPeriod,
  selectedPlan,
  addOns,
  usageBasedEntitlements,
  charges,
  checkoutRef,
  checkoutStage,
  checkoutStages,
  error,
  isLoading,
  paymentMethodId,
  promoCode,
  requiresPayment,
  setCheckoutStage,
  setError,
  setIsLoading,
  updatePromoCode,
  showHeader = true,
}: SidebarProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data, mode, layout, hydrate, setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const currentPlan = data.company?.plan;

  const currentAddOns = data.company?.addOns || [];

  const currentUsageBasedEntitlements = useMemo(() => {
    return (data.featureUsage?.features || []).reduce(
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
    );
  }, [data.featureUsage?.features, planPeriod]);

  const { payAsYouGoEntitlements, payInAdvanceEntitlements } = useMemo(() => {
    const payAsYouGoEntitlements: UsageBasedEntitlement[] = [];
    const payInAdvanceEntitlements = usageBasedEntitlements.filter(
      (entitlement) => {
        if (entitlement.priceBehavior === "pay_as_you_go") {
          payAsYouGoEntitlements.push(entitlement);
        }

        return entitlement.priceBehavior === "pay_in_advance";
      },
    );

    return { payAsYouGoEntitlements, payInAdvanceEntitlements };
  }, [usageBasedEntitlements]);

  const subscriptionPrice = useMemo(() => {
    let planPrice: number | undefined;
    let currency: string | undefined;

    if (selectedPlan) {
      const planBillingPrice = getBillingPrice(
        planPeriod === "year"
          ? selectedPlan.yearlyPrice
          : selectedPlan.monthlyPrice,
      );

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
        sum +=
          getBillingPrice(
            planPeriod === "year" ? addOn.yearlyPrice : addOn.monthlyPrice,
          )?.price ?? 0;
      }

      return sum;
    }, 0);
    total += addOnCost;

    const payInAdvanceCost = payInAdvanceEntitlements.reduce(
      (sum, entitlement) =>
        sum +
        entitlement.quantity *
          (getBillingPrice(
            planPeriod === "year"
              ? entitlement.meteredYearlyPrice
              : entitlement.meteredMonthlyPrice,
          )?.price ?? 0),
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

  const dispatchPlanChangedEvent = <T extends object>(detail: T) => {
    const event = new CustomEvent("plan-changed", {
      bubbles: true,
      detail,
    });
    window.dispatchEvent(event);
  };

  const checkout = useCallback(async () => {
    const priceId = (
      planPeriod === "year"
        ? selectedPlan?.yearlyPrice
        : selectedPlan?.monthlyPrice
    )?.id;
    if (!api || !selectedPlan || !priceId) {
      return;
    }

    try {
      setError(undefined);
      setIsLoading(true);

      const response = await api.checkout({
        changeSubscriptionRequestBody: {
          newPlanId: selectedPlan.id,
          newPriceId: priceId,
          addOnIds: addOns.reduce((acc: UpdateAddOnRequestBody[], addOn) => {
            if (addOn.isSelected && !selectedPlan.companyCanTrial) {
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
          payInAdvance: payInAdvanceEntitlements.reduce(
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
          ),
          ...(paymentMethodId && { paymentMethodId }),
          ...(promoCode && { promoCode }),
        },
      });
      dispatchPlanChangedEvent(response.data);

      setIsLoading(false);
      setLayout("portal");
      hydrate();
    } catch {
      setLayout("checkout");
      setError(
        t("Error processing payment. Please try a different payment method."),
      );
    } finally {
      setIsLoading(false);
    }
  }, [
    t,
    api,
    hydrate,
    paymentMethodId,
    planPeriod,
    selectedPlan,
    addOns,
    setError,
    setIsLoading,
    setLayout,
    payInAdvanceEntitlements,
    promoCode,
  ]);

  const unsubscribe = useCallback(async () => {
    if (!api) {
      return;
    }

    try {
      setError(undefined);
      setIsLoading(true);

      const response = await api.checkoutUnsubscribe();
      dispatchPlanChangedEvent(response.data);

      setLayout("portal");
      hydrate();
    } catch {
      setLayout("unsubscribe");
      setError(t("Unsubscribe failed"));
    } finally {
      setIsLoading(false);
    }
  }, [t, api, hydrate, setError, setIsLoading, setLayout]);

  const selectedAddOns = addOns.filter((addOn) => addOn.isSelected);

  const {
    changedUsageBasedEntitlements,
    addedUsageBasedEntitlements,
    removedUsageBasedEntitlements,
    willUsageBasedEntitlementsChange,
  } = useMemo(() => {
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
              data.featureUsage?.features.find(
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
      changedUsageBasedEntitlements,
      addedUsageBasedEntitlements,
      removedUsageBasedEntitlements,
      willUsageBasedEntitlementsChange,
    };
  }, [
    selectedPlan,
    data.featureUsage?.features,
    currentUsageBasedEntitlements,
    usageBasedEntitlements,
  ]);

  const willPlanChange =
    typeof selectedPlan !== "undefined" && !selectedPlan.current;

  const removedAddOns = currentAddOns.filter(
    (current) =>
      !selectedAddOns.some((selected) => current.id === selected.id) &&
      current.planPeriod !== "one-time",
  );
  const addedAddOns = selectedAddOns.filter(
    (selected) => !currentAddOns.some((current) => selected.id === current.id),
  );
  const willAddOnsChange = removedAddOns.length > 0 || addedAddOns.length > 0;

  const willPayInAdvanceEntitlementsChange =
    payInAdvanceEntitlements.length > 0 &&
    payInAdvanceEntitlements.some(({ quantity, usage }) => quantity !== usage);

  const hasUnstagedChanges =
    willPlanChange || willAddOnsChange || willPayInAdvanceEntitlementsChange;

  const canUpdateSubscription = mode === "edit" || (api !== null && !isLoading);
  const canCheckout =
    canUpdateSubscription &&
    (!!data.subscription?.paymentMethod || typeof paymentMethodId === "string");

  const isTrialable = selectedPlan?.companyCanTrial;
  const today = new Date();
  const trialEndsOn = new Date(today);
  if (isTrialable && selectedPlan.trialDays) {
    trialEndsOn.setDate(trialEndsOn.getDate() + selectedPlan.trialDays);
  }

  const selectedPlanBillingPrice = getBillingPrice(
    planPeriod === "year"
      ? selectedPlan?.yearlyPrice
      : selectedPlan?.monthlyPrice,
  );

  return (
    <Flex
      ref={checkoutRef}
      tabIndex={0}
      $flexDirection="column"
      $flexShrink={0}
      $overflow="auto"
      $backgroundColor={theme.card.background}
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
            <Text
              as="h3"
              $font={theme.typography.heading3.fontFamily}
              $size={theme.typography.heading3.fontSize}
              $weight={theme.typography.heading3.fontWeight}
              $color={theme.typography.heading3.color}
            >
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
          <Text
            $font={theme.typography.text.fontFamily}
            $size={14}
            $weight={theme.typography.text.fontWeight}
            $color={theme.typography.text.color}
          >
            {t("Plan")}
          </Text>
        </Box>

        <Flex $flexDirection="column" $gap="0.5rem" $marginBottom="1.5rem">
          {data.company?.plan && (
            <Flex
              $justifyContent="space-between"
              $alignItems="center"
              $gap="1rem"
              {...(willPlanChange && {
                $opacity: "0.625",
                $textDecoration: "line-through",
                $color: theme.typography.heading4.color,
              })}
            >
              <Box>
                <Text
                  $font={theme.typography.heading4.fontFamily}
                  $size={theme.typography.heading4.fontSize}
                  $weight={theme.typography.heading4.fontWeight}
                  $color={theme.typography.heading4.color}
                >
                  {data.company.plan.name}
                </Text>
              </Box>

              {typeof data.company.plan.planPrice === "number" && (
                <Box $whiteSpace="nowrap">
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {formatCurrency(
                      data.company.plan.planPrice,
                      data.company.billingSubscription?.currency,
                    )}
                    <sub>
                      /
                      {shortenPeriod(
                        data.company.plan.planPeriod || planPeriod,
                      )}
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
                  style={{
                    display: "inline-block",
                    color: theme.typography.text.color,
                  }}
                />
              </Box>

              <Flex
                $justifyContent="space-between"
                $alignItems="center"
                $gap="1rem"
              >
                <Flex>
                  <Text
                    $font={theme.typography.heading4.fontFamily}
                    $size={theme.typography.heading4.fontSize}
                    $weight={theme.typography.heading4.fontWeight}
                    $color={theme.typography.heading4.color}
                  >
                    {selectedPlan.name}
                  </Text>
                </Flex>

                <Flex $whiteSpace="nowrap">
                  <Text
                    $font={theme.typography.text.fontFamily}
                    $size={theme.typography.text.fontSize}
                    $weight={theme.typography.text.fontWeight}
                    $color={theme.typography.text.color}
                  >
                    {formatCurrency(
                      selectedPlanBillingPrice?.price ?? 0,
                      selectedPlanBillingPrice?.currency,
                    )}
                    <sub>/{shortenPeriod(planPeriod)}</sub>
                  </Text>
                </Flex>
              </Flex>
            </Box>
          )}
        </Flex>

        {willUsageBasedEntitlementsChange && (
          <Flex $flexDirection="column" $gap="0.5rem" $marginBottom="1.5rem">
            <Box $opacity="0.625">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {t("Usage-based")}
              </Text>
            </Box>

            {removedUsageBasedEntitlements.reduce(
              (acc: React.ReactElement[], entitlement, index) => {
                if (
                  typeof entitlement.allocation === "number" &&
                  entitlement.feature?.name
                ) {
                  const {
                    price: entitlementPrice,
                    currency: entitlementCurrency,
                  } =
                    getBillingPrice(
                      planPeriod === "year"
                        ? entitlement.yearlyUsageBasedPrice
                        : entitlement.monthlyUsageBasedPrice,
                    ) || {};

                  acc.push(
                    <Flex
                      key={index}
                      $justifyContent="space-between"
                      $alignItems="center"
                      $gap="1rem"
                      $opacity="0.625"
                      $textDecoration="line-through"
                      $color={theme.typography.heading4.color}
                    >
                      <Box>
                        <Text
                          $font={theme.typography.heading4.fontFamily}
                          $size={theme.typography.heading4.fontSize}
                          $weight={theme.typography.heading4.fontWeight}
                          $color={theme.typography.heading4.color}
                        >
                          {entitlement.priceBehavior === "pay_in_advance" ? (
                            <>
                              {entitlement.quantity}{" "}
                              {getFeatureName(
                                entitlement.feature,
                                entitlement.quantity,
                              )}
                            </>
                          ) : (
                            entitlement.feature.name
                          )}
                        </Text>
                      </Box>

                      <Box $whiteSpace="nowrap">
                        <Text
                          $font={theme.typography.text.fontFamily}
                          $size={theme.typography.text.fontSize}
                          $weight={theme.typography.text.fontWeight}
                          $color={theme.typography.text.color}
                        >
                          {entitlement.priceBehavior === "pay_in_advance" && (
                            <>
                              {formatCurrency(
                                (entitlementPrice ?? 0) * entitlement.quantity,
                                entitlementCurrency,
                              )}
                              <sub>/{shortenPeriod(planPeriod)}</sub>
                            </>
                          )}
                          {entitlement.priceBehavior === "pay_as_you_go" && (
                            <>
                              {formatCurrency(
                                entitlementPrice ?? 0,
                                entitlementCurrency,
                              )}
                              <sub>
                                /{getFeatureName(entitlement.feature, 1)}
                              </sub>
                            </>
                          )}
                        </Text>
                      </Box>
                    </Flex>,
                  );
                }

                return acc;
              },
              [],
            )}

            {changedUsageBasedEntitlements.reduce(
              (acc: React.ReactElement[], { previous, next }, index) => {
                if (next.feature?.name) {
                  const {
                    price: entitlementPrice,
                    currency: entitlementCurrency,
                  } =
                    getBillingPrice(
                      planPeriod === "year"
                        ? next.meteredYearlyPrice
                        : next.meteredMonthlyPrice,
                    ) || {};

                  acc.push(
                    <Box key={index}>
                      <Flex
                        $justifyContent="space-between"
                        $alignItems="center"
                        $gap="1rem"
                        $opacity="0.625"
                        $textDecoration="line-through"
                        $color={theme.typography.heading4.color}
                      >
                        <Box>
                          <Text
                            $font={theme.typography.heading4.fontFamily}
                            $size={theme.typography.heading4.fontSize}
                            $weight={theme.typography.heading4.fontWeight}
                            $color={theme.typography.heading4.color}
                          >
                            {previous.quantity} {getFeatureName(next.feature)}
                          </Text>
                        </Box>

                        <Box $whiteSpace="nowrap">
                          <Text
                            $font={theme.typography.text.fontFamily}
                            $size={theme.typography.text.fontSize}
                            $weight={theme.typography.text.fontWeight}
                            $color={theme.typography.text.color}
                          >
                            {formatCurrency(
                              (entitlementPrice ?? 0) * previous.quantity,
                              entitlementCurrency,
                            )}
                            <sub>/{shortenPeriod(planPeriod)}</sub>
                          </Text>
                        </Box>
                      </Flex>

                      {/* TODO */}
                      <Flex
                        $justifyContent="space-between"
                        $alignItems="center"
                        $gap="1rem"
                      >
                        <Box>
                          <Text
                            $font={theme.typography.heading4.fontFamily}
                            $size={theme.typography.heading4.fontSize}
                            $weight={theme.typography.heading4.fontWeight}
                            $color={theme.typography.heading4.color}
                          >
                            {next.quantity} {getFeatureName(next.feature)}
                          </Text>
                        </Box>

                        <Box $whiteSpace="nowrap">
                          <Text
                            $font={theme.typography.text.fontFamily}
                            $size={theme.typography.text.fontSize}
                            $weight={theme.typography.text.fontWeight}
                            $color={theme.typography.text.color}
                          >
                            {formatCurrency(
                              (entitlementPrice ?? 0) * next.quantity,
                              entitlementCurrency,
                            )}
                            <sub>/{shortenPeriod(planPeriod)}</sub>
                          </Text>
                        </Box>
                      </Flex>
                    </Box>,
                  );
                }

                return acc;
              },
              [],
            )}

            {addedUsageBasedEntitlements.reduce(
              (acc: React.ReactElement[], entitlement, index) => {
                if (entitlement.feature?.name) {
                  const {
                    price: entitlementPrice,
                    currency: entitlementCurrency,
                  } =
                    getBillingPrice(
                      planPeriod === "year"
                        ? entitlement.meteredYearlyPrice
                        : entitlement.meteredMonthlyPrice,
                    ) || {};

                  acc.push(
                    <Flex
                      key={index}
                      $justifyContent="space-between"
                      $alignItems="center"
                      $gap="1rem"
                    >
                      <Box>
                        <Text
                          $font={theme.typography.heading4.fontFamily}
                          $size={theme.typography.heading4.fontSize}
                          $weight={theme.typography.heading4.fontWeight}
                          $color={theme.typography.heading4.color}
                        >
                          {entitlement.priceBehavior === "pay_in_advance" ? (
                            <>
                              {entitlement.quantity}{" "}
                              {getFeatureName(
                                entitlement.feature,
                                entitlement.quantity,
                              )}
                            </>
                          ) : (
                            entitlement.feature.name
                          )}
                        </Text>
                      </Box>

                      <Box $whiteSpace="nowrap">
                        <Text
                          $font={theme.typography.text.fontFamily}
                          $size={theme.typography.text.fontSize}
                          $weight={theme.typography.text.fontWeight}
                          $color={theme.typography.text.color}
                        >
                          {entitlement.priceBehavior === "pay_in_advance" && (
                            <>
                              {formatCurrency(
                                (entitlementPrice ?? 0) * entitlement.quantity,
                                entitlementCurrency,
                              )}
                              <sub>/{shortenPeriod(planPeriod)}</sub>
                            </>
                          )}
                          {entitlement.priceBehavior === "pay_as_you_go" && (
                            <>
                              {formatCurrency(
                                entitlementPrice ?? 0,
                                entitlementCurrency,
                              )}
                              <sub>
                                /{getFeatureName(entitlement.feature, 1)}
                              </sub>
                            </>
                          )}
                        </Text>
                      </Box>
                    </Flex>,
                  );
                }

                return acc;
              },
              [],
            )}
          </Flex>
        )}

        {selectedPlan && isTrialable && (
          <Box>
            <Box $opacity="0.625">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {t("Trial")}
              </Text>
            </Box>
            <Flex
              $justifyContent="space-between"
              $alignItems="center"
              $gap="1rem"
            >
              <Flex>
                <Text
                  $font={theme.typography.heading4.fontFamily}
                  $size={theme.typography.heading4.fontSize}
                  $weight={theme.typography.heading4.fontWeight}
                  $color={theme.typography.heading4.color}
                >
                  {t("Ends on", { date: trialEndsOn.toLocaleDateString() })}
                </Text>
              </Flex>
              <Flex>
                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={theme.typography.text.fontSize}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.typography.text.color}
                >
                  -
                  {formatCurrency(
                    selectedPlanBillingPrice?.price ?? 0,
                    selectedPlanBillingPrice?.currency,
                  )}
                  /<sub>{shortenPeriod(planPeriod)}</sub>
                </Text>
              </Flex>
            </Flex>
          </Box>
        )}

        {(willAddOnsChange || selectedAddOns.length > 0) && (
          <Flex $flexDirection="column" $gap="0.5rem" $marginBottom="1.5rem">
            <Box $opacity="0.625">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {t("Add-ons")}
              </Text>
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
                  $color={theme.typography.heading4.color}
                >
                  <Box>
                    <Text
                      $font={theme.typography.heading4.fontFamily}
                      $size={theme.typography.heading4.fontSize}
                      $weight={theme.typography.heading4.fontWeight}
                      $color={theme.typography.heading4.color}
                    >
                      {addOn.name}
                    </Text>
                  </Box>

                  {typeof addOn.planPrice === "number" && addOn.planPeriod && (
                    <Box $whiteSpace="nowrap">
                      <Text
                        $font={theme.typography.text.fontFamily}
                        $size={theme.typography.text.fontSize}
                        $weight={theme.typography.text.fontWeight}
                        $color={theme.typography.text.color}
                      >
                        {formatCurrency(
                          addOn.planPrice,
                          selectedPlanBillingPrice?.currency,
                        )}
                        {addOn.planPeriod !== "one-time" && (
                          <sub>`/${shortenPeriod(planPeriod)}`</sub>
                        )}
                      </Text>
                    </Box>
                  )}
                </Flex>
              );
            })}

            {selectedAddOns.map((addOn, index) => {
              const { price: addOnPrice, currency: addOnCurrency } =
                getBillingPrice(getAddOnPrice(addOn, planPeriod)) || {};

              return (
                <Flex
                  key={index}
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                >
                  <Box>
                    <Text
                      $font={theme.typography.heading4.fontFamily}
                      $size={theme.typography.heading4.fontSize}
                      $weight={theme.typography.heading4.fontWeight}
                      $color={theme.typography.heading4.color}
                    >
                      {addOn.name}
                    </Text>
                  </Box>

                  <Box $whiteSpace="nowrap">
                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                    >
                      {formatCurrency(addOnPrice ?? 0, addOnCurrency)}
                      {addOn.chargeType !== ChargeType.oneTime && (
                        <sub>`/${shortenPeriod(planPeriod)}`</sub>
                      )}
                    </Text>
                  </Box>
                </Flex>
              );
            })}
          </Flex>
        )}

        {proration !== 0 && (
          <>
            <Box $opacity="0.625">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {proration > 0
                  ? t("Proration")
                  : !selectedPlan?.companyCanTrial && t("Credits")}
              </Text>
            </Box>

            <Flex $flexDirection="column" $gap="0.5rem">
              {currentPlan && (
                <Flex
                  $justifyContent="space-between"
                  $alignItems="center"
                  $gap="1rem"
                >
                  <Flex>
                    <Text
                      $font={theme.typography.heading4.fontFamily}
                      $size={theme.typography.heading4.fontSize}
                      $weight={theme.typography.heading4.fontWeight}
                      $color={theme.typography.heading4.color}
                    >
                      {t("Unused time")}
                    </Text>
                  </Flex>

                  <Flex>
                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                    >
                      {formatCurrency(
                        proration,
                        selectedPlanBillingPrice?.currency,
                      )}
                    </Text>
                  </Flex>
                </Flex>
              )}
            </Flex>
          </>
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
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {t("Discount")}
              </Text>
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
              <Text
                $font={theme.typography.text.fontFamily}
                $size={0.75 * theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {promoCode}
              </Text>

              <Box
                $cursor="pointer"
                onClick={() => {
                  updatePromoCode?.(undefined);
                }}
              >
                <Icon
                  name="close"
                  style={{
                    color: isLightBackground
                      ? "hsl(0, 0%, 0%)"
                      : "hsl(0, 0%, 100%)",
                  }}
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
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {t("X% off", { percent: percentOff })}
              </Text>
            </Box>

            <Box>
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {formatCurrency(
                  (newCharges / 100) * percentOff,
                  selectedPlanBillingPrice?.currency,
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
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {t("X off", {
                  amount: formatCurrency(
                    Math.abs(amountOff),
                    selectedPlanBillingPrice?.currency,
                  ),
                })}
              </Text>
            </Box>

            <Box>
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                -
                {formatCurrency(
                  Math.abs(amountOff),
                  selectedPlanBillingPrice?.currency,
                )}
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
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {planPeriod === "year" ? "Yearly" : "Monthly"} total:
              </Text>
            </Box>

            <Box $whiteSpace="nowrap">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
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
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {t("Due today")}:
              </Text>
            </Box>

            <Box>
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {formatCurrency(
                  Math.max(0, dueNow),
                  selectedPlanBillingPrice?.currency,
                )}
              </Text>
            </Box>
          </Flex>
        )}

        {dueNow < 0 && (
          <Flex $justifyContent="space-between" $gap="1rem">
            <Box $opacity="0.625" $lineHeight={1.15}>
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {t("Credits to be applied to future invoices")}:
              </Text>
            </Box>

            <Box>
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {formatCurrency(
                  Math.abs(dueNow),
                  selectedPlanBillingPrice?.currency,
                )}
              </Text>
            </Box>
          </Flex>
        )}

        {layout === "checkout" && (
          <StageButton
            canTrial={selectedPlan?.companyCanTrial === true}
            canCheckout={canCheckout}
            canUpdateSubscription={canUpdateSubscription}
            checkout={checkout}
            checkoutStage={checkoutStage}
            checkoutStages={checkoutStages}
            hasAddOns={addOns.length > 0}
            hasPayInAdvanceEntitlements={payInAdvanceEntitlements.length > 0}
            hasUnstagedChanges={hasUnstagedChanges}
            isLoading={isLoading}
            requiresPayment={requiresPayment}
            setCheckoutStage={setCheckoutStage}
            trialPaymentMethodRequired={
              data.trialPaymentMethodRequired === true
            }
          />
        )}

        {layout === "unsubscribe" && (
          <Button onClick={unsubscribe} $isLoading={isLoading}>
            {t("Cancel subscription")}
          </Button>
        )}

        {!isLoading && error && (
          <Box>
            <Text
              $font={theme.typography.text.fontFamily}
              $size={theme.typography.text.fontSize}
              $weight={500}
              $color="#DB6669"
            >
              {error}
            </Text>
          </Box>
        )}

        {layout !== "unsubscribe" && (
          <Box $opacity="0.625">
            <Text
              $font={theme.typography.text.fontFamily}
              $size={theme.typography.text.fontSize}
              $weight={theme.typography.text.fontWeight}
              $color={theme.typography.text.color}
            >
              {subscriptionPrice &&
                // TODO: localize
                `You will be billed ${subscriptionPrice} ${payAsYouGoEntitlements.length > 0 ? "plus usage based costs" : ""} for this subscription
                every ${planPeriod} ${periodStart ? `on the ${formatOrdinal(periodStart.getDate())}` : ""} ${planPeriod === "year" && periodStart ? `of ${getMonthName(periodStart)}` : ""} unless you unsubscribe.`}
            </Text>
          </Box>
        )}
      </Flex>
    </Flex>
  );
};
