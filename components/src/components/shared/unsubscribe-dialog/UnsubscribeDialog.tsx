import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useTheme } from "styled-components";

import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
} from "../../../hooks";
import { toPrettyDate } from "../../../utils";
import { Box, Button, Flex, Icon, Modal, Text } from "../../ui";
import { createActiveUsageBasedEntitlementsReducer } from "../checkout-dialog";
import { Sidebar } from "../sidebar";

interface UnsubscribeDialogProps {
  top?: number;
}

export const UnsubscribeDialog = ({ top = 0 }: UnsubscribeDialogProps) => {
  const { t } = useTranslation();

  const theme = useTheme();

  const { data, setLayout, setSelected } = useEmbed();

  const contentRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const planPeriod = useMemo(
    () => data.company?.plan?.planPeriod ?? "month",
    [data.company?.plan?.planPeriod],
  );

  const { plans: availablePlans, addOns: availableAddOns } =
    useAvailablePlans(planPeriod);

  const selectedPlan = useMemo(
    () =>
      availablePlans.find(
        (plan) =>
          plan.id === data.company?.plan?.id &&
          data.company?.plan.planPeriod === planPeriod,
      ),
    [data.company?.plan, planPeriod, availablePlans],
  );

  const currentEntitlements = data.featureUsage?.features || [];
  const usageBasedEntitlements = (selectedPlan?.entitlements || []).reduce(
    createActiveUsageBasedEntitlementsReducer(currentEntitlements, planPeriod),
    [],
  );

  const addOns = useMemo(
    () =>
      availableAddOns.map((available) => ({
        ...available,
        isSelected:
          data.company?.addOns.some((current) => available.id === current.id) ??
          false,
      })),
    [data.company?.addOns, availableAddOns],
  );

  const cancelDate = new Date(
    data.subscription?.cancelAt || data.upcomingInvoice?.dueDate || Date.now(),
  );

  const isLightBackground = useIsLightBackground();

  const handleClose = useCallback(() => {
    setLayout("portal");
  }, [setLayout]);

  return (
    <Modal
      id="unsubscribe-dialog"
      size="auto"
      top={top}
      contentRef={contentRef}
    >
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

            <Button
              onClick={() => {
                setSelected({
                  planId: data.company?.plan?.id,
                  addOnId: undefined,
                  usage: false,
                });
                setLayout("checkout");
              }}
              $size="sm"
              $color="secondary"
              $variant="ghost"
            >
              {t("Manage plan")}
            </Button>
          </Flex>
        </Flex>

        <Sidebar
          planPeriod={planPeriod}
          addOns={addOns}
          usageBasedEntitlements={usageBasedEntitlements}
          error={error}
          isLoading={isLoading}
          showHeader={false}
          requiresPayment={false}
          setError={(msg) => setError(msg)}
          setIsLoading={setIsLoading}
        />
      </Flex>
    </Modal>
  );
};
