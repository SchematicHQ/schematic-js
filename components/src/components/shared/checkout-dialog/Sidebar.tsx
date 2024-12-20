import { useCallback, useMemo } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import type {
  CompanyPlanWithBillingSubView,
  CompanyPlanDetailResponseData,
  SetupIntentResponseData,
  UpdateAddOnRequestBody,
} from "../../../api";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { formatCurrency, formatOrdinal, getMonthName } from "../../../utils";
import { Box, EmbedButton, Flex, Icon, Text } from "../../ui";

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
  error?: string;
  isLoading: boolean;
  paymentMethodId?: string;
  planPeriod: string;
  selectedPlan?: CompanyPlanDetailResponseData;
  setCheckoutStage: (stage: string) => void;
  setError: (msg?: string) => void;
  setSetupIntent: (intent: SetupIntentResponseData | undefined) => void;
  showPaymentForm: boolean;
  toggleLoading: () => void;
}

export const Sidebar = ({
  addOns,
  charges,
  checkoutRef,
  checkoutStage,
  currentAddOns,
  currentPlan,
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
}: SidebarProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { api, data, mode, setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const subscriptionPrice = useMemo(() => {
    if (
      !selectedPlan ||
      !selectedPlan.monthlyPrice ||
      !selectedPlan.yearlyPrice
    ) {
      return;
    }

    return formatCurrency(
      (planPeriod === "month"
        ? selectedPlan.monthlyPrice
        : selectedPlan.yearlyPrice
      )?.price,
    );
  }, [selectedPlan, planPeriod]);

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
          payInAdvance: [],
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
  ]);

  const shortPeriod = (p: string) => (p === "month" ? "mo" : "yr");

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
        )) &&
      !isLoading);

  const canCheckout =
    canUpdateSubscription &&
    ((data.subscription?.paymentMethod && !showPaymentForm) || paymentMethodId);

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
        $flexDirection="column"
        $position="relative"
        $gap="0.125rem"
        $width="100%"
        $padding="1.5rem"
        $flex="1"
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
            {"Plan"}
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
                  <Box>
                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                    >
                      {formatCurrency(currentPlan.planPrice)}/
                      <sub>{shortPeriod(currentPlan.planPeriod)}</sub>
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

                <Flex>
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
                    /<sub>{shortPeriod(planPeriod)}</sub>
                  </Text>
                </Flex>
              </Flex>
            </Box>
          )}
        </Flex>

        {selectedPlan && isTrialable && (
            <Box>
              <Box $opacity="0.625">
                <Text
                  $font={theme.typography.text.fontFamily}
                  $size={14}
                  $weight={theme.typography.text.fontWeight}
                  $color={theme.typography.text.color}
                >
                  {"Trial"}
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
                    {"Ends on " + trialEndsOn.toLocaleDateString()}
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
                    /<sub>{shortPeriod(planPeriod)}</sub>
                  </Text>
                </Flex>
              </Flex>
            </Box>
          )}

        {willAddOnsChange && (
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
                  <Box>
                    <Text
                      $font={theme.typography.text.fontFamily}
                      $size={theme.typography.text.fontSize}
                      $weight={theme.typography.text.fontWeight}
                      $color={theme.typography.text.color}
                    >
                      {formatCurrency(addOn.planPrice)}/
                      <sub>{shortPeriod(addOn.planPeriod)}</sub>
                    </Text>
                  </Box>
                )}
              </Flex>
            ))}

            {addedAddOns.map((addOn) => (
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

                <Box>
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
                    /<sub>{shortPeriod(planPeriod)}</sub>
                  </Text>
                </Box>
              </Flex>
            ))}
          </Flex>
        )}

        {typeof charges?.proration === "number" && (
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

            {charges.proration && (
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
            )}
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

            <Box>
              <Text
                $font={theme.typography.text.fontFamily}
                $size={theme.typography.text.fontSize}
                $weight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                {subscriptionPrice}/<sub>{shortPeriod(planPeriod)}</sub>
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

        {checkoutStage === "plan" && (
          <>
          {!selectedPlan?.companyCanTrial && (
            <EmbedButton
              disabled={!addOns.length && !canUpdateSubscription}
              onClick={async () => {
                if (!addOns.length && api && data.component?.id) {
                  const { data: setupIntent } = await api.getSetupIntent({
                    componentId: data.component.id,
                  });
                  setSetupIntent(setupIntent);
                }

                setCheckoutStage((addOns.length) ? "addons" : "checkout");
              }}
              isLoading={isLoading}
            >
              <Flex
                $gap="0.5rem"
                $justifyContent="center"
                $alignItems="center"
                $padding="0 1rem"
              >
                {t("Next")}: {addOns.length ? t("Addons") : t("Checkout")}
                <Icon name="arrow-right" />
              </Flex>
            </EmbedButton>
          )}
          {selectedPlan?.companyCanTrial && (
            <EmbedButton
              disabled={!canUpdateSubscription}
              onClick={async () => {
                if (api && data.component?.id) {
                  const { data: setupIntent } = await api.getSetupIntent({
                    componentId: data.component.id,
                  });
                  setSetupIntent(setupIntent);
                }
                checkout();
              }}
              isLoading={isLoading}
            >
              <Flex
                $gap="0.5rem"
                $justifyContent="center"
                $alignItems="center"
                $padding="0 1rem"
              >
                {t("Checkout Trial")}
                <Icon name="arrow-right" />
              </Flex>
            </EmbedButton>
          )}
          </>
        )}

        {checkoutStage === "addons" && (
          <EmbedButton
            disabled={!canUpdateSubscription}
            onClick={async () => {
              if (!api || !data.component?.id) {
                return;
              }

              const { data: setupIntent } = await api.getSetupIntent({
                componentId: data.component.id,
              });
              setSetupIntent(setupIntent);

              setCheckoutStage("checkout");
            }}
            isLoading={isLoading}
          >
            <Flex
              $gap="0.5rem"
              $justifyContent="center"
              $alignItems="center"
              $padding="0 1rem"
            >
              {t("Next")}: {t("Checkout")}
              <Icon name="arrow-right" />
            </Flex>
          </EmbedButton>
        )}

        {checkoutStage === "checkout" && (
          <EmbedButton
            disabled={isLoading || !canCheckout}
            onClick={checkout}
            isLoading={isLoading}
          >
            {t("Pay now")}
          </EmbedButton>
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

        <Box $opacity="0.625">
          <Text
            $font={theme.typography.text.fontFamily}
            $size={theme.typography.text.fontSize}
            $weight={theme.typography.text.fontWeight}
            $color={theme.typography.text.color}
          >
            {subscriptionPrice &&
              // TODO: localize
              `You will be billed ${subscriptionPrice} for this subscription
                every ${planPeriod} ${charges?.periodStart ? `on the ${formatOrdinal(charges.periodStart.getDate())}` : ""} ${planPeriod === "year" && charges?.periodStart ? `of ${getMonthName(charges.periodStart)}` : ""} unless you unsubscribe.`}
          </Text>
        </Box>
      </Flex>
    </Flex>
  );
};
