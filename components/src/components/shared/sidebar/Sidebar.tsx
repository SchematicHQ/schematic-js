import {
  useCallback,
  useMemo,
  type Dispatch,
  type SetStateAction,
} from "react";
import { useTranslation } from "react-i18next";

import type {
  FeatureUsageResponseData,
  PlanEntitlementResponseData,
  PreviewSubscriptionFinanceResponseData,
  UpdateAddOnRequestBody,
  UpdatePayInAdvanceRequestBody,
} from "../../../api/checkoutexternal";
import {
  useEmbed,
  useIsLightBackground,
  type SelectedPlan,
} from "../../../hooks";
import {
  ChargeType,
  formatCurrency,
  formatOrdinal,
  getAddOnPrice,
  getBillingPrice,
  getFeatureName,
  getMonthName,
  isCheckoutData,
  isHydratedPlan,
  shortenPeriod,
} from "../../../utils";
import { Box, Button, Flex, Icon, Text } from "../../ui";
import { type CheckoutStage } from "../checkout-dialog";

import { Proration } from "./Proration";
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
  willTrial?: boolean;
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
  willTrial = false,
}: SidebarProps) => {
  const { t } = useTranslation();

  const { data, settings, mode, layout, setLayout, checkout, unsubscribe } =
    useEmbed();

  const isLightBackground = useIsLightBackground();

  const {
    currentPlanPeriod,
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
        currentPlanPeriod: data.company?.plan?.planPeriod,
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
      currentPlanPeriod: undefined,
      currentPlan: undefined,
      currentAddOns: [],
      currentEntitlements: [],
      currentUsageBasedEntitlements: [],
      billingSubscription: undefined,
      paymentMethod: undefined,
      trialPaymentMethodRequired: true,
    };
  }, [data, planPeriod]);

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

  const handleCheckout = useCallback(async () => {
    const planId =
      selectedPlan?.id || (isCheckoutData(data) && data.company?.plan?.id);
    const priceId =
      (planPeriod === "year"
        ? selectedPlan?.yearlyPrice
        : selectedPlan?.monthlyPrice
      )?.id ||
      (isCheckoutData(data) && data.subscription?.products[0].priceId);

    if (!planId || !priceId) {
      // TODO: set checkout "error" message
      return;
    }

    try {
      setError(undefined);
      setIsLoading(true);

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
    data,
    checkout,
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
      changedUsageBasedEntitlements,
      addedUsageBasedEntitlements,
      removedUsageBasedEntitlements,
      willUsageBasedEntitlementsChange,
    };
  }, [
    selectedPlan,
    currentEntitlements,
    currentUsageBasedEntitlements,
    usageBasedEntitlements,
  ]);

  const willPeriodChange = planPeriod !== currentPlanPeriod;

  const willPlanChange =
    typeof selectedPlan !== "undefined" &&
    isHydratedPlan(selectedPlan) &&
    !selectedPlan.current;

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
    willPeriodChange ||
    willPlanChange ||
    willAddOnsChange ||
    willPayInAdvanceEntitlementsChange;

  const canUpdateSubscription = mode === "edit" || !isLoading;
  const canCheckout =
    canUpdateSubscription &&
    (!!paymentMethod || typeof paymentMethodId === "string");

  const isTrialable =
    isHydratedPlan(selectedPlan) &&
    selectedPlan?.companyCanTrial === true &&
    selectedPlan?.isTrialable === true;
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
                  style={{
                    display: "inline-block",
                    color: settings.theme.typography.text.color,
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
              <Text $size={14}>{t("Usage-based")}</Text>
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
                    packageSize: entitlementPackageSize = 1,
                  } = getBillingPrice(
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
                      $color={settings.theme.typography.heading4.color}
                    >
                      <Box>
                        <Text display="heading4">
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
                        <Text>
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
                                /
                                {entitlementPackageSize > 1 && (
                                  <>{entitlementPackageSize} </>
                                )}
                                {getFeatureName(
                                  entitlement.feature,
                                  entitlementPackageSize,
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
                        $color={settings.theme.typography.heading4.color}
                      >
                        <Box>
                          <Text display="heading4">
                            {previous.quantity} {getFeatureName(next.feature)}
                          </Text>
                        </Box>

                        <Box $whiteSpace="nowrap">
                          <Text>
                            {formatCurrency(
                              (entitlementPrice ?? 0) * previous.quantity,
                              entitlementCurrency,
                            )}
                            <sub>/{shortenPeriod(planPeriod)}</sub>
                          </Text>
                        </Box>
                      </Flex>

                      <Flex
                        $justifyContent="space-between"
                        $alignItems="center"
                        $gap="1rem"
                      >
                        <Box>
                          <Text display="heading4">
                            {next.quantity} {getFeatureName(next.feature)}
                          </Text>
                        </Box>

                        <Box $whiteSpace="nowrap">
                          <Text>
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
                    packageSize: entitlementPackageSize = 1,
                  } = getBillingPrice(
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
                        <Text display="heading4">
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
                        <Text>
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
                                /
                                {entitlementPackageSize > 1 && (
                                  <>{entitlementPackageSize} </>
                                )}
                                {getFeatureName(
                                  entitlement.feature,
                                  entitlementPackageSize,
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
                        {formatCurrency(
                          addOn.planPrice,
                          selectedPlanBillingPrice?.currency,
                        )}
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
                getBillingPrice(getAddOnPrice(addOn, planPeriod)) || {};

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

        {proration !== 0 && charges && selectedPlanBillingPrice?.currency && (
          <Proration
            charges={charges}
            currency={selectedPlanBillingPrice.currency}
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
              <Text>{t("X% off", { percent: percentOff })}</Text>
            </Box>

            <Box>
              <Text>
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
              <Text>
                {t("X off", {
                  amount: formatCurrency(
                    Math.abs(amountOff),
                    selectedPlanBillingPrice?.currency,
                  ),
                })}
              </Text>
            </Box>

            <Box>
              <Text>
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
              <Text>{planPeriod === "year" ? "Yearly" : "Monthly"} total:</Text>
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
              <Text>{t("Credits to be applied to future invoices")}:</Text>
            </Box>

            <Box>
              <Text>
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
            canTrial={isTrialable}
            canCheckout={canCheckout}
            canUpdateSubscription={canUpdateSubscription}
            checkout={handleCheckout}
            checkoutStage={checkoutStage}
            checkoutStages={checkoutStages}
            hasPlan={typeof selectedPlan !== "undefined"}
            hasAddOns={addOns.length > 0}
            hasPayInAdvanceEntitlements={payInAdvanceEntitlements.length > 0}
            hasUnstagedChanges={hasUnstagedChanges}
            isLoading={isLoading}
            requiresPayment={requiresPayment}
            setCheckoutStage={setCheckoutStage}
            trialPaymentMethodRequired={trialPaymentMethodRequired}
            willTrial={willTrial}
          />
        )}

        {layout === "unsubscribe" && (
          <Button onClick={handleUnsubscribe} $isLoading={isLoading} $fullWidth>
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
                `You will be billed ${subscriptionPrice} ${payAsYouGoEntitlements.length > 0 ? "plus usage based costs" : ""} for this subscription
                every ${planPeriod} ${periodStart ? `on the ${formatOrdinal(periodStart.getDate())}` : ""} ${planPeriod === "year" && periodStart ? `of ${getMonthName(periodStart)}` : ""} unless you unsubscribe.`}
            </Text>
          </Box>
        )}
      </Flex>
    </Flex>
  );
};
