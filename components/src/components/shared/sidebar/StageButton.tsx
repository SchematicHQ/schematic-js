import { useTranslation } from "react-i18next";

import { Button, Flex, Icon } from "../../ui";
import { type CheckoutStage } from "../checkout-dialog";

type StageButtonProps = {
  checkout: () => Promise<void>;
  checkoutStage?: string;
  checkoutStages?: CheckoutStage[];
  hasAddOns: boolean;
  hasPayInAdvanceEntitlements: boolean;
  hasPaymentMethod: boolean;
  hasPlan: boolean;
  inEditMode: boolean;
  isLoading: boolean;
  isPaymentMethodRequired: boolean;
  isSelectedPlanTrialable: boolean;
  setCheckoutStage?: (stage: string) => void;
  trialPaymentMethodRequired: boolean;
  shouldTrial: boolean;
  willTrialFree: boolean;
};

export const StageButton = ({
  checkout,
  checkoutStage,
  checkoutStages,
  hasAddOns,
  hasPayInAdvanceEntitlements,
  hasPaymentMethod,
  hasPlan,
  inEditMode,
  isLoading,
  isPaymentMethodRequired,
  isSelectedPlanTrialable,
  setCheckoutStage,
  trialPaymentMethodRequired,
  shouldTrial,
  willTrialFree,
}: StageButtonProps) => {
  const { t } = useTranslation();

  const isDisabled = isLoading || !hasPlan || inEditMode;

  const NoPaymentRequired = () => {
    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={checkout}
        $isLoading={isLoading}
        $fullWidth
      >
        {t("Subscribe and close")}
      </Button>
    );
  };

  if (checkoutStage === "plan") {
    if (isSelectedPlanTrialable && trialPaymentMethodRequired && shouldTrial) {
      return (
        <Button
          type="button"
          disabled={isDisabled}
          onClick={async () => {
            setCheckoutStage?.("checkout");
          }}
          $isLoading={isLoading}
          $fullWidth
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
        </Button>
      );
    }

    if (
      !isPaymentMethodRequired &&
      !checkoutStages?.some(
        (stage) => stage.id === "usage" || stage.id === "addons",
      )
    ) {
      return <NoPaymentRequired />;
    }

    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={async () => {
          setCheckoutStage?.(
            hasPayInAdvanceEntitlements
              ? "usage"
              : hasAddOns
                ? "addons"
                : "checkout",
          );
        }}
        $isLoading={isLoading}
        $fullWidth
      >
        <Flex $gap="0.5rem" $justifyContent="center" $alignItems="center">
          {t("Next")}:{" "}
          {hasPayInAdvanceEntitlements
            ? t("Usage")
            : hasAddOns
              ? t("Addons")
              : t("Checkout")}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "usage") {
    if (
      !isPaymentMethodRequired &&
      !checkoutStages?.some((stage) => stage.id === "addons")
    ) {
      return <NoPaymentRequired />;
    }

    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={async () => {
          setCheckoutStage?.(hasAddOns ? "addons" : "checkout");
        }}
        $isLoading={isLoading}
        $fullWidth
      >
        <Flex
          $gap="0.5rem"
          $justifyContent="center"
          $alignItems="center"
          $padding="0 1rem"
        >
          {t("Next")}: {hasAddOns ? t("Addons") : t("Checkout")}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "addons") {
    if (!isPaymentMethodRequired) {
      return <NoPaymentRequired />;
    }

    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={async () => {
          setCheckoutStage?.("checkout");
        }}
        $isLoading={isLoading}
        $fullWidth
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
      </Button>
    );
  }

  if (checkoutStage === "checkout") {
    if (!isPaymentMethodRequired) {
      return <NoPaymentRequired />;
    }

    return (
      <Button
        type="button"
        disabled={isDisabled || !hasPaymentMethod}
        onClick={checkout}
        $isLoading={isLoading}
        $fullWidth
      >
        {willTrialFree ? t("Start trial") : t("Pay now")}
      </Button>
    );
  }
};
