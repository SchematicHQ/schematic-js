import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type {
  CompanyPlanWithBillingSubView,
  PlanEntitlementResponseData,
  PreviewSubscriptionChangeResponseData,
  UpdateAddOnRequestBody,
  UpdatePayInAdvanceRequestBody,
  UsageBasedEntitlementResponseData,
} from "../../../api";
import {
  useEmbed,
  useIsLightBackground,
  type SelectedPlan,
} from "../../../hooks";
import {
  formatCurrency,
  formatOrdinal,
  getMonthName,
  shortenPeriod,
} from "../../../utils";
import { Box, Flex, Icon, Text } from "../../ui";
import { type CheckoutStage } from ".";
import { StageButton } from "./StageButton";

interface SidebarProps {
  addOns: SelectedPlan[];
  charges?: PreviewSubscriptionChangeResponseData;
  checkoutRef?: React.RefObject<HTMLDivElement | null>;
  checkoutStage: string;
  checkoutStages: CheckoutStage[];
  currentAddOns: CompanyPlanWithBillingSubView[];
  currentUsageBasedEntitlements: {
    usageData: UsageBasedEntitlementResponseData;
    allocation: number;
    quantity: number;
  }[];
  error?: string;
  currentPlan?: SelectedPlan;
  isLoading: boolean;
  paymentMethodId?: string;
  planPeriod: string;
  promoCode?: string;
  requiresPayment: boolean;
  selectedPlan?: SelectedPlan;
  setCheckoutStage: (stage: string) => void;
  setError: (msg?: string) => void;
  showPaymentForm: boolean;
  toggleLoading: () => void;
  updatePromoCode: (code?: string) => void;
  usageBasedEntitlements: {
    entitlement: PlanEntitlementResponseData;
    allocation: number;
    quantity: number;
    usage: number;
  }[];
}

export const Sidebar = ({
  addOns,
  charges,
  checkoutRef,
  checkoutStage,
  checkoutStages,
  currentAddOns,
  currentUsageBasedEntitlements,
  error,
  currentPlan,
  isLoading,
  paymentMethodId,
  planPeriod,
  promoCode,
  requiresPayment,
  selectedPlan,
  setCheckoutStage,
  setError,
  showPaymentForm,
  toggleLoading,
  updatePromoCode,
  usageBasedEntitlements,
}: SidebarProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data, mode, setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const payInAdvanceEntitlements = usageBasedEntitlements.filter(
    ({ entitlement }) => entitlement.priceBehavior === "pay_in_advance",
  );

  const payAsYouGoEntitlements = usageBasedEntitlements.filter(
    ({ entitlement }) => entitlement.priceBehavior === "pay_as_you_go",
  );

  const subscriptionPrice = useMemo(() => {
    if (
      !selectedPlan ||
      !selectedPlan.monthlyPrice ||
      !selectedPlan.yearlyPrice
    ) {
      return;
    }

    let total = 0;

    const planPrice = (
      planPeriod === "month"
        ? selectedPlan.monthlyPrice
        : selectedPlan.yearlyPrice
    )?.price;
    if (planPrice) {
      total += planPrice;
    }

    const addOnCost = addOns.reduce(
      (sum, addOn) =>
        sum +
        (addOn.isSelected
          ? (planPeriod === "month" ? addOn.monthlyPrice : addOn.yearlyPrice)
              ?.price || 0
          : 0),
      0,
    );
    total += addOnCost;

    const payInAdvanceCost = payInAdvanceEntitlements.reduce(
      (sum, { entitlement, quantity }) =>
        sum +
        quantity *
          ((planPeriod === "month"
            ? entitlement.meteredMonthlyPrice
            : entitlement.meteredYearlyPrice
          )?.price || 0),
      0,
    );
    total += payInAdvanceCost;

    return formatCurrency(total);
  }, [selectedPlan, addOns, payInAdvanceEntitlements, planPeriod]);

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

  const checkout = useCallback(async () => {
    const priceId = (
      planPeriod === "month"
        ? selectedPlan?.monthlyPrice
        : selectedPlan?.yearlyPrice
    )?.id;
    if (!api || !selectedPlan || !priceId) {
      return;
    }

    try {
      setError(undefined);
      toggleLoading();

      await api.checkout({
        changeSubscriptionRequestBody: {
          newPlanId: selectedPlan.id,
          newPriceId: priceId,
          addOnIds: addOns.reduce((acc: UpdateAddOnRequestBody[], addOn) => {
            if (addOn.isSelected && !selectedPlan.companyCanTrial) {
              const addOnPriceId = (
                planPeriod === "month"
                  ? addOn?.monthlyPrice
                  : addOn?.yearlyPrice
              )?.id;

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
              { entitlement, quantity },
            ) => {
              const priceId = (
                planPeriod === "month"
                  ? entitlement.meteredMonthlyPrice
                  : entitlement.meteredYearlyPrice
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
      setLayout("success");
    } catch {
      setError(
        t("Error processing payment. Please try a different payment method."),
      );
    } finally {
      toggleLoading();
    }
  }, [
    t,
    api,
    paymentMethodId,
    planPeriod,
    selectedPlan,
    addOns,
    setError,
    setLayout,
    toggleLoading,
    payInAdvanceEntitlements,
    promoCode,
  ]);

  const selectedAddOns = addOns.filter((addOn) => addOn.isSelected);

  const willPlanChange =
    typeof selectedPlan !== "undefined" && selectedPlan.current === false;

  const canUpdateSubscription =
    mode === "edit" ||
    (api !== null &&
      (willPlanChange ||
        // TODO: test add-on comparison for finding "changes"
        selectedAddOns.length !== currentAddOns.length ||
        !selectedAddOns.every((addOn) =>
          currentAddOns.some((currentAddOn) => addOn.id === currentAddOn.id),
        ) ||
        payInAdvanceEntitlements.every(
          ({ quantity, usage }) => quantity >= usage,
        )) &&
      !isLoading);

  const canCheckout =
    canUpdateSubscription &&
    ((data.subscription?.paymentMethod && !showPaymentForm) ||
      typeof paymentMethodId === "string");

  const changedUsageBasedEntitlements: {
    entitlement: PlanEntitlementResponseData;
    previous: {
      allocation: number;
      quantity: number;
      usageData: UsageBasedEntitlementResponseData;
    };
    next: {
      allocation: number;
      quantity: number;
      usage: number;
    };
  }[] = [];
  const addedUsageBasedEntitlements = usageBasedEntitlements.reduce(
    (
      acc: {
        entitlement: PlanEntitlementResponseData;
        quantity: number;
      }[],
      selected,
    ) => {
      const changed = currentUsageBasedEntitlements.find(
        (current) =>
          current.usageData.featureId === selected.entitlement.featureId &&
          current.quantity !== selected.quantity,
      );

      if (changed) {
        changedUsageBasedEntitlements.push({
          entitlement: selected.entitlement,
          previous: changed,
          next: {
            allocation: selected.allocation,
            quantity: selected.quantity,
            usage: selected.usage,
          },
        });
      } else {
        acc.push(selected);
      }

      return acc;
    },
    [],
  );

  const removedUsageBasedEntitlements = currentUsageBasedEntitlements.reduce(
    (
      acc: {
        entitlement: PlanEntitlementResponseData;
        allocation: number;
        quantity: number;
      }[],
      current,
    ) => {
      const match =
        usageBasedEntitlements.every(
          ({ entitlement }) =>
            entitlement.featureId !== current.usageData.featureId,
        ) &&
        currentPlan?.entitlements.find(
          (entitlement) =>
            entitlement.featureId === current.usageData.featureId,
        );
      if (match) {
        acc.push({
          entitlement: match,
          allocation: current.allocation,
          quantity: current.quantity,
        });
      }

      return acc;
    },
    [],
  );

  const willUsageBasedEntitlementsChange =
    changedUsageBasedEntitlements.length > 0 ||
    addedUsageBasedEntitlements.length > 0 ||
    removedUsageBasedEntitlements.length > 0;

  const removedAddOns = currentAddOns.filter(
    (current) => !selectedAddOns.some((selected) => current.id === selected.id),
  );
  const addedAddOns = selectedAddOns.filter(
    (selected) => !currentAddOns.some((current) => selected.id === current.id),
  );
  const willAddOnsChange = removedAddOns.length > 0 || addedAddOns.length > 0;

  const isTrialable = selectedPlan?.companyCanTrial;
  const today = new Date();
  const trialEndsOn = new Date(today);
  if (isTrialable && selectedPlan.trialDays) {
    trialEndsOn.setDate(trialEndsOn.getDate() + selectedPlan.trialDays);
  }

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
          isLightBackground ? "hsla(0, 0%, 0%, 0.1)" : "hsla(0, 0%, 100%, 0.2)"
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
                    {formatCurrency(data.company.plan.planPrice)}
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
                      (planPeriod === "month"
                        ? selectedPlan.monthlyPrice
                        : selectedPlan.yearlyPrice
                      )?.price ?? 0,
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
              (
                acc: React.ReactElement[],
                { allocation, quantity, entitlement },
              ) => {
                if (
                  typeof allocation === "number" &&
                  entitlement.feature?.name
                ) {
                  const price = (
                    planPeriod === "month"
                      ? entitlement.meteredMonthlyPrice
                      : entitlement.meteredYearlyPrice
                  )?.price;

                  acc.push(
                    <Flex
                      key={entitlement.id}
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
                              {quantity}{" "}
                              {pluralize(entitlement.feature.name, quantity)}
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
                          {entitlement.priceBehavior === "pay_in_advance" &&
                            typeof price === "number" && (
                              <>
                                {formatCurrency(price * quantity)}
                                <sub>/{shortenPeriod(planPeriod)}</sub>
                              </>
                            )}
                          {entitlement.priceBehavior === "pay_as_you_go" &&
                            typeof price === "number" && (
                              <>
                                {formatCurrency(price)}
                                <sub>
                                  /
                                  {pluralize(
                                    entitlement.feature.name.toLowerCase(),
                                    1,
                                  )}
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
              (acc: React.ReactElement[], { entitlement, previous, next }) => {
                if (entitlement?.feature?.name) {
                  acc.push(
                    <Box key={entitlement.feature.id}>
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
                            {previous.quantity}{" "}
                            {pluralize(entitlement.feature.name)}
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
                              ((planPeriod === "month"
                                ? entitlement.meteredMonthlyPrice
                                : entitlement.meteredYearlyPrice
                              )?.price || 0) * previous.quantity,
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
                            {next.quantity}{" "}
                            {pluralize(entitlement.feature.name)}
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
                              ((planPeriod === "month"
                                ? entitlement.meteredMonthlyPrice
                                : entitlement.meteredYearlyPrice
                              )?.price || 0) * next.quantity,
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
              (acc: React.ReactElement[], { entitlement, quantity }) => {
                if (entitlement.feature?.name) {
                  const price = (
                    planPeriod === "month"
                      ? entitlement.meteredMonthlyPrice
                      : entitlement.meteredYearlyPrice
                  )?.price;

                  acc.push(
                    <Flex
                      key={entitlement.id}
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
                              {quantity}{" "}
                              {pluralize(entitlement.feature.name, quantity)}
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
                          {entitlement.priceBehavior === "pay_in_advance" &&
                            typeof price === "number" && (
                              <>
                                {formatCurrency(price * quantity)}
                                <sub>/{shortenPeriod(planPeriod)}</sub>
                              </>
                            )}
                          {entitlement.priceBehavior === "pay_as_you_go" &&
                            typeof price === "number" && (
                              <>
                                {formatCurrency(price)}
                                <sub>
                                  /
                                  {pluralize(
                                    entitlement.feature.name.toLowerCase(),
                                    1,
                                  )}
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
                    (planPeriod === "month"
                      ? selectedPlan.monthlyPrice
                      : selectedPlan.yearlyPrice
                    )?.price ?? 0,
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

            {removedAddOns.map((addOn) => (
              <Flex
                key={addOn.id}
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
                      {formatCurrency(addOn.planPrice)}
                      <sub>/{shortenPeriod(addOn.planPeriod)}</sub>
                    </Text>
                  </Box>
                )}
              </Flex>
            ))}

            {selectedAddOns.map((addOn) => (
              <Flex
                key={addOn.id}
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
                    {formatCurrency(
                      (planPeriod === "month"
                        ? addOn.monthlyPrice
                        : addOn.yearlyPrice
                      )?.price ?? 0,
                    )}
                    <sub>/{shortenPeriod(planPeriod)}</sub>
                  </Text>
                </Box>
              </Flex>
            ))}
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
              {currentPlan?.current && (
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
                      {formatCurrency(proration)}
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
                  updatePromoCode(undefined);
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
                {formatCurrency((newCharges / 100) * percentOff)}
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
                  amount: formatCurrency(Math.abs(amountOff)),
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
                -{formatCurrency(Math.abs(amountOff))}
              </Text>
            </Box>
          </Flex>
        )}

        {selectedPlan && subscriptionPrice && (
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
                {planPeriod === "month" ? "Monthly" : "Yearly"} total:
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
                {formatCurrency(Math.max(0, dueNow))}
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
                {formatCurrency(Math.abs(dueNow))}
              </Text>
            </Box>
          </Flex>
        )}

        <StageButton
          canTrial={selectedPlan?.companyCanTrial === true}
          canCheckout={canCheckout === true}
          canUpdateSubscription={canUpdateSubscription}
          checkout={checkout}
          checkoutStage={checkoutStage}
          checkoutStages={checkoutStages}
          hasAddOns={addOns.length > 0}
          hasPayInAdvanceEntitlements={payInAdvanceEntitlements.length > 0}
          isLoading={isLoading}
          requiresPayment={requiresPayment}
          setCheckoutStage={setCheckoutStage}
          trialPaymentMethodRequired={data.trialPaymentMethodRequired === true}
        />

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
      </Flex>
    </Flex>
  );
};
