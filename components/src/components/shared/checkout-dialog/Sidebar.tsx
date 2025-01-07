import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import pluralize from "pluralize";
import type {
  CompanyPlanDetailResponseData,
  CompanyPlanWithBillingSubView,
  PlanEntitlementResponseData,
  SetupIntentResponseData,
  UpdateAddOnRequestBody,
  UpdatePayInAdvanceRequestBody,
  UsageBasedEntitlementResponseData,
} from "../../../api";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import {
  formatCurrency,
  formatOrdinal,
  getMonthName,
  shortenPeriod,
} from "../../../utils";
import { Box, Flex, Icon, Text } from "../../ui";
import { StageButton } from "./StageButton";

interface SidebarProps {
  addOns: (CompanyPlanDetailResponseData & { isSelected: boolean })[];
  charges?: {
    dueNow: number;
    newCharges: number;
    proration: number;
    periodStart: Date;
  };
  checkoutRef?: React.RefObject<HTMLDivElement>;
  checkoutStage: string;
  currentAddOns: CompanyPlanWithBillingSubView[];
  currentPlan?: CompanyPlanWithBillingSubView;
  currentUsageBasedEntitlements: {
    usageData: UsageBasedEntitlementResponseData;
    allocation: number;
    quantity: number;
  }[];
  error?: string;
  isLoading: boolean;
  paymentMethodId?: string;
  planPeriod: string;
  selectedPlan?: CompanyPlanDetailResponseData & { isSelected: boolean };
  setCheckoutStage: (stage: string) => void;
  setError: (msg?: string) => void;
  setSetupIntent: (intent: SetupIntentResponseData | undefined) => void;
  showPaymentForm: boolean;
  toggleLoading: () => void;
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
  currentAddOns,
  currentPlan,
  currentUsageBasedEntitlements,
  error,
  isLoading,
  paymentMethodId,
  planPeriod,
  selectedPlan,
  setCheckoutStage,
  setError,
  setSetupIntent,
  showPaymentForm,
  toggleLoading,
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

    const addOnCost = addOns.reduce((sum, addOn) => {
      return (
        sum +
        (addOn.isSelected
          ? (planPeriod === "month" ? addOn.monthlyPrice : addOn.yearlyPrice)
              ?.price || 0
          : 0)
      );
    }, 0);
    total += addOnCost;

    const payInAdvanceCost = payInAdvanceEntitlements.reduce(
      (sum, { entitlement, quantity }) => {
        return (
          sum +
          quantity *
            ((planPeriod === "month"
              ? entitlement.meteredMonthlyPrice
              : entitlement.meteredYearlyPrice
            )?.price || 0)
        );
      },
      0,
    );
    total += payInAdvanceCost;

    return formatCurrency(total);
  }, [selectedPlan, addOns, payInAdvanceEntitlements, planPeriod]);

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
  ]);

  const selectedAddOns = addOns.filter((addOn) => addOn.isSelected);

  const willPlanChange =
    selectedPlan &&
    (selectedPlan.id !== currentPlan?.id ||
      planPeriod !== currentPlan.planPeriod);

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
    usageData: UsageBasedEntitlementResponseData;
    entitlement?: PlanEntitlementResponseData;
    quantity: number;
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
      const changedEntitlement = selectedPlan?.entitlements.find(
        (entitlement) => entitlement.id === selected.entitlement.id,
      );

      if (changed) {
        changedUsageBasedEntitlements.push({
          ...changed,
          entitlement: changedEntitlement,
        });
      }

      acc.push(selected);

      return acc;
    },
    [],
  );
  const willUsageBasedEntitlementsChange =
    changedUsageBasedEntitlements.length > 0 ||
    addedUsageBasedEntitlements.length > 0;

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
          {currentPlan && (
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
                  {currentPlan.name}
                </Text>
              </Box>

              {typeof currentPlan.planPrice === "number" &&
                currentPlan.planPeriod && (
                  <Box $whiteSpace="nowrap">
                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                    >
                      {formatCurrency(currentPlan.planPrice)}
                      <sub>/{shortenPeriod(currentPlan.planPeriod)}</sub>
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

            {changedUsageBasedEntitlements.reduce(
              (acc: JSX.Element[], { entitlement, quantity }) => {
                if (entitlement?.feature?.name) {
                  acc.push(
                    <Flex
                      key={entitlement.feature.id}
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
                          {quantity} {pluralize(entitlement.feature.name)}
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
                            )?.price || 0) * quantity,
                          )}
                          <sub>/{shortenPeriod(planPeriod)}</sub>
                        </Text>
                      </Box>
                    </Flex>,
                  );
                }

                return acc;
              },
              [],
            )}

            {addedUsageBasedEntitlements.reduce(
              (acc: JSX.Element[], { entitlement, quantity }) => {
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
                          {entitlement.priceBehavior === "pay_as_you_go" && (
                            <>TBD</>
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

        {typeof charges?.proration === "number" && charges.proration !== 0 && (
          <>
            <Box $opacity="0.625">
              <Text
                $font={theme.typography.text.fontFamily}
                $size={14}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {charges.proration > 0 ? t("Proration") : t("Credits")}
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
                      {formatCurrency(charges.proration)}
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
        {selectedPlan && subscriptionPrice && (
          <Flex $justifyContent="space-between" $gap="1rem">
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
          <Flex $justifyContent="space-between" $gap="1rem">
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
                {formatCurrency(Math.max(0, charges.dueNow))}
              </Text>
            </Box>
          </Flex>
        )}

        {typeof charges?.dueNow === "number" && charges.dueNow < 0 && (
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
                {formatCurrency(Math.abs(charges.dueNow))}
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
          hasAddOns={addOns.length > 0}
          hasPayInAdvanceEntitlements={payInAdvanceEntitlements.length > 0}
          isLoading={isLoading}
          setCheckoutStage={setCheckoutStage}
          setSetupIntent={setSetupIntent}
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
                every ${planPeriod} ${charges?.periodStart ? `on the ${formatOrdinal(charges.periodStart.getDate())}` : ""} ${planPeriod === "year" && charges?.periodStart ? `of ${getMonthName(charges.periodStart)}` : ""} unless you unsubscribe.`}
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
};
