import { Box, EmbedButton, Flex, Icon, Modal, Text } from "../../ui";
import { Sidebar } from "../sidebar";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { useCallback, useMemo, useState } from "react";
import type {
  PlanEntitlementResponseData,
  UsageBasedEntitlementResponseData,
} from "../../../api";
import { toPrettyDate } from "../../../utils";

export const UnsubscribeDialog = () => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { data, setSelected } = useEmbed();

  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);
  const planPeriod = useMemo(
    () => data?.company?.plan?.planPeriod ?? "month",
    [data?.company?.plan?.planPeriod],
  );

  const { setLayout } = useEmbed();

  const currentPlan = useMemo(
    () => ({
      ...data?.company?.plan,
      monthlyPrice: { price: data?.company?.plan?.planPrice },
      yearlyPrice: { price: data?.company?.plan?.planPrice },
    }),
    [data?.company?.plan],
  );

  const currentAddOns = useMemo(
    () => data?.company?.addOns || [],
    [data?.company?.addOns],
  );
  const addOns = useMemo(
    () =>
      currentAddOns.map((addOn) => ({
        ...addOn,
        isSelected: true,
        monthlyPrice: {
          price: addOn.planPrice,
        },
        yearlyPrice: {
          price: addOn.planPrice,
        },
      })),
    [currentAddOns],
  );

  const currentUsageBasedEntitlements = useMemo(
    () =>
      (data?.activeUsageBasedEntitlements || []).reduce(
        (
          acc: {
            entitlement: UsageBasedEntitlementResponseData &
              Pick<
                PlanEntitlementResponseData,
                "feature" | "meteredMonthlyPrice" | "meteredYearlyPrice" | "id"
              >;
            usageData: UsageBasedEntitlementResponseData;
            allocation: number;
            quantity: number;
            usage: number;
          }[],
          usageData,
        ) => {
          const featureUsage = data?.featureUsage?.features.find(
            (usage) => usage.feature?.id === usageData.featureId,
          );
          const allocation = featureUsage?.allocation ?? 0;
          const usage = featureUsage?.usage ?? 0;

          acc.push({
            entitlement: {
              ...usageData,
              id: featureUsage?.entitlementId ?? usageData.featureId,
              feature: featureUsage?.feature,
              meteredMonthlyPrice: usageData.meteredPrice,
              meteredYearlyPrice: usageData.meteredPrice,
            },
            usageData,
            allocation,
            quantity: allocation ?? usage,
            usage,
          });

          return acc;
        },
        [],
      ),
    [data?.activeUsageBasedEntitlements, data?.featureUsage?.features],
  );

  const cancelDate = new Date(
    data?.subscription?.cancelAt ||
      data?.upcomingInvoice?.dueDate ||
      Date.now(),
  );

  const isLightBackground = useIsLightBackground();

  const handleClose = useCallback(() => {
    setLayout("portal");
  }, [setLayout]);

  return (
    <Modal id="unsubscribe-dialog" size="auto">
      <Box
        $display="inline-flex"
        $position="absolute"
        $top={0}
        $right={0}
        $zIndex={1}
        $cursor="pointer"
        onClick={handleClose}
      >
        <Icon
          name="close"
          style={{
            fontSize: 36,
            color: isLightBackground
              ? "hsla(0, 0%, 0%, 0.275)"
              : "hsla(0, 0%, 100%, 0.275)",
          }}
        />
      </Box>

      <Flex
        $position="relative"
        $flexDirection="column"
        $height="auto"
        $viewport={{
          md: {
            $flexDirection: "row",
            $height: "calc(100% - 5rem)",
          },
        }}
      >
        <Flex
          $flexDirection="column"
          $flexWrap="wrap"
          $justifyContent="space-around"
          $gap="5rem"
          $padding="2.5rem"
        >
          <Flex $flexDirection="column" $flexWrap="wrap" $gap="0.5rem">
            <Text
              as="h2"
              $font={theme.typography.heading2.fontFamily}
              $size={theme.typography.heading2.fontSize}
              $weight={theme.typography.heading2.fontWeight}
              $color={theme.typography.heading2.color}
            >
              {t("Cancel subscription")}
            </Text>

            <Text
              as="p"
              $font={theme.typography.text.fontFamily}
              $size={theme.typography.text.fontSize}
              $weight={theme.typography.text.fontWeight}
              $color={theme.typography.text.color}
            >
              {t(
                "You will retain access to your plan until the end of the billing period, on",
              )}{" "}
              {cancelDate
                ? toPrettyDate(cancelDate, {
                    month: "numeric",
                  })
                : ""}
            </Text>
          </Flex>

          <Flex $flexDirection="column" $flexWrap="wrap" $gap="0.5rem">
            <Text
              as="p"
              $font={theme.typography.text.fontFamily}
              $size={theme.typography.text.fontSize}
              $weight={theme.typography.text.fontWeight}
              $color={theme.typography.text.color}
            >
              {t("Not ready to cancel?")}
            </Text>

            <EmbedButton
              onClick={() => {
                setSelected({
                  planId: currentPlan?.id,
                  addOnId: undefined,
                  usage: false,
                });
                setLayout("checkout");
              }}
              $size="sm"
              $color="secondary"
              $variant="ghost"
              $fullWidth={false}
            >
              {t("Manage plan")}
            </EmbedButton>
          </Flex>
        </Flex>

        <Sidebar
          addOns={addOns as unknown as never}
          checkoutStage="checkout"
          checkoutStages={[]}
          currentAddOns={currentAddOns}
          currentUsageBasedEntitlements={currentUsageBasedEntitlements}
          error={error}
          currentPlan={currentPlan as unknown as never}
          isLoading={isLoading}
          planPeriod={planPeriod}
          requiresPayment={false}
          setCheckoutStage={() => {}}
          setError={(msg) => setError(msg)}
          showPaymentForm={false}
          toggleLoading={() => setIsLoading((prev) => !prev)}
          updatePromoCode={() => {}}
          usageBasedEntitlements={
            currentUsageBasedEntitlements as unknown as never
          }
          showHeader={false}
        />
      </Flex>
    </Modal>
  );
};
