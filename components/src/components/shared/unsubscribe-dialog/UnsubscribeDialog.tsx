import { useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { useEmbed } from "../../../hooks";
import { isCheckoutData, toPrettyDate } from "../../../utils";
import { Button, Flex, Modal, ModalHeader, Text } from "../../ui";
import { Sidebar } from "../sidebar";

interface UnsubscribeDialogProps {
  top?: number;
}

export const UnsubscribeDialog = ({ top = 0 }: UnsubscribeDialogProps) => {
  const { t } = useTranslation();

  const { data, setCheckoutState } = useEmbed();

  const contentRef = useRef<HTMLDivElement>(null);

  const [error, setError] = useState<string | undefined>();
  const [isLoading, setIsLoading] = useState(false);

  const { planPeriod, currentPlan, cancelDate } = useMemo(() => {
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

  return (
    <Modal size="auto" top={top} contentRef={contentRef}>
      <ModalHeader />

      <Flex
        $position="relative"
        $flexDirection="column"
        $viewport={{
          md: {
            $flexDirection: "row",
          },
        }}
      >
        <Flex
          $flexDirection="column"
          $flexWrap="wrap"
          $justifyContent="center"
          $gap="2rem"
          $marginTop="-2.5rem"
          $padding="0 2.5rem 2.5rem"
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

        <Sidebar
          showHeader={false}
          planPeriod={planPeriod}
          error={error}
          isLoading={isLoading}
          setError={(msg) => setError(msg)}
          setIsLoading={setIsLoading}
        />
      </Flex>
    </Modal>
  );
};
