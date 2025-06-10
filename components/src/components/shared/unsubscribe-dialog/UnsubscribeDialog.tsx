import { useCallback, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import {
  useAvailablePlans,
  useEmbed,
  useIsLightBackground,
} from "../../../hooks";
import { isCheckoutData, toPrettyDate } from "../../../utils";
import { Button, Flex, Icon, Modal, Text } from "../../ui";
import { createActiveUsageBasedEntitlementsReducer } from "../checkout-dialog";
import { Sidebar } from "../sidebar";

interface UnsubscribeDialogProps {
  top?: number;
}

export const UnsubscribeDialog = ({ top = 0 }: UnsubscribeDialogProps) => {
  const { t } = useTranslation();

  const { data, setCheckoutState, setLayout } = useEmbed();

  const contentRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const { planPeriod, currentPlan, currentAddOns, featureUsage, cancelDate } =
    useMemo(() => {
      if (isCheckoutData(data)) {
        return {
          planPeriod: data.company?.plan?.planPeriod || "month",
          currentPlan: data.company?.plan,
          currentAddOns: data.company?.addOns || [],
          featureUsage: data.featureUsage,
          cancelDate: new Date(
            data.subscription?.cancelAt ||
              data.upcomingInvoice?.dueDate ||
              Date.now(),
          ),
        };
      }

      return {
        planPeriod: "month",
        currentPlan: undefined,
        currentAddOns: [],
        featureUsage: undefined,
        cancelDate: new Date(),
      };
    }, [data]);

  const { plans: availablePlans, addOns: availableAddOns } =
    useAvailablePlans(planPeriod);

  const selectedPlan = useMemo(
    () => availablePlans.find((plan) => plan.id === currentPlan?.id),
    [currentPlan?.id, availablePlans],
  );

  const currentEntitlements = featureUsage?.features || [];
  const usageBasedEntitlements = (selectedPlan?.entitlements || []).reduce(
    createActiveUsageBasedEntitlementsReducer(currentEntitlements, planPeriod),
    [],
  );

  const addOns = useMemo(
    () =>
      availableAddOns.map((available) => ({
        ...available,
        isSelected:
          currentAddOns.some((current) => available.id === current.id) ?? false,
      })),
    [currentAddOns, availableAddOns],
  );

  const isLightBackground = useIsLightBackground();

  const handleClose = useCallback(() => {
    setLayout("portal");
  }, [setLayout]);

  return (
    <Modal size="auto" top={top} contentRef={contentRef}>
      <Button
        type="button"
        onClick={handleClose}
        style={{
          position: "absolute",
          top: 0,
          right: 0,
          zIndex: 1,
          display: "inline-flex",
          padding: "0.5rem 0.5rem 0 0",
          textDecoration: "none",
          cursor: "pointer",
        }}
        $color="secondary"
        $variant="text"
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
      </Button>

      <Flex
        $position="relative"
        $flexDirection="column"
        $minHeight="320px"
        $paddingTop="1.5rem"
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
          $justifyContent="center"
          $gap="2rem"
          $padding="1rem 2.5rem 2.5rem"
        >
          <Flex $flexDirection="column" $flexWrap="wrap" $gap="0.5rem">
            <Text as="h2" display="heading2">
              {t("Cancel subscription")}
            </Text>

            <Text as="p">
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
            <Text as="p">{t("Not ready to cancel?")}</Text>

            <Button
              type="button"
              onClick={() => {
                setCheckoutState({
                  planId: currentPlan?.id,
                  addOnId: undefined,
                  usage: false,
                });
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
