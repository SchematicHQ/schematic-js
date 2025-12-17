import { useCallback, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useAvailablePlans, useEmbed } from "../../../hooks";
import { toPrettyDate } from "../../../utils";
import { Button, Flex, Modal, ModalContent, ModalHeader, Text } from "../../ui";
import { createActiveUsageBasedEntitlementsReducer } from "../checkout-dialog";
import { SubscriptionSidebar } from "../subscription-sidebar";

interface UnsubscribeDialogProps {
  top?: number;
}

export const UnsubscribeDialog = ({ top = 0 }: UnsubscribeDialogProps) => {
  const { t } = useTranslation();

  const { data, setLayout, setCheckoutState, clearCheckoutState } = useEmbed();

  const modalRef = useRef<HTMLDialogElement>(null);

  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const { planPeriod, currentPlan, currentAddOns, featureUsage, cancelDate } =
    useMemo(() => {
      const cancelDate =
        data?.subscription?.cancelAt || data?.upcomingInvoice?.dueDate;

      return {
        planPeriod: data?.company?.plan?.planPeriod || "month",
        currentPlan: data?.company?.plan,
        currentAddOns: data?.company?.addOns || [],
        featureUsage: data?.featureUsage,
        cancelDate: cancelDate ? new Date(cancelDate) : new Date(),
      };
    }, [
      data?.company?.addOns,
      data?.company?.plan,
      data?.featureUsage,
      data?.subscription?.cancelAt,
      data?.upcomingInvoice?.dueDate,
    ]);

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

  const handleClose = useCallback(() => {
    clearCheckoutState();
    setLayout("portal");
  }, [setLayout, clearCheckoutState]);

  useLayoutEffect(() => {
    const element = modalRef.current;
    element?.showModal();
  }, []);

  return (
    <Modal ref={modalRef} size="auto" top={top} onClose={handleClose}>
      <ModalHeader onClose={handleClose} />

      <ModalContent>
        <Flex
          $flexDirection="column"
          $flexGrow={1}
          $gap="2rem"
          $padding="0 2.5rem 2.5rem"
          $overflow="auto"
        >
          <Flex $flexDirection="column" $flexWrap="wrap" $gap="0.5rem">
            <Text as="h2" display="heading2">
              {t("Cancel subscription")}
            </Text>

            <Text as="p">
              {t(
                "You will retain access to your plan until the end of the billing period, on",
              )}{" "}
              {toPrettyDate(cancelDate, {
                month: "numeric",
              })}
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

        <SubscriptionSidebar
          modalRef={modalRef}
          planPeriod={planPeriod}
          addOns={addOns}
          usageBasedEntitlements={usageBasedEntitlements}
          error={error}
          isLoading={isLoading}
          isPaymentMethodRequired={false}
          showHeader={false}
          setError={(msg) => setError(msg)}
          setIsLoading={setIsLoading}
          setConfirmPaymentIntent={() => {}}
        />
      </ModalContent>
    </Modal>
  );
};
