import { RefObject } from "react";
import { useTranslation } from "react-i18next";

import { Button, Flex, Icon } from "../../ui";
import { type CheckoutStage } from "../checkout-dialog";

type NoPaymentRequiredProps = {
  isDisabled: boolean;
  isLoading: boolean;
  isSticky?: boolean;
  willScheduleDowngrade?: boolean;
  onClick: () => Promise<void>;
};

const NoPaymentRequired = ({
  isDisabled,
  isLoading,
  isSticky = false,
  willScheduleDowngrade = false,
  onClick,
}: NoPaymentRequiredProps) => {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      $size={isSticky ? "sm" : "md"}
      $fullWidth
      $isLoading={isLoading}
    >
      {willScheduleDowngrade
        ? t("Schedule downgrade")
        : t("Subscribe and close")}
    </Button>
  );
};

type CheckoutStageButtonProps = {
  canCheckout: boolean;
  checkout: () => Promise<void>;
  checkoutStage?: string;
  checkoutStages?: CheckoutStage[];
  hasPaymentMethod: boolean;
  hasPlan: boolean;
  inEditMode: boolean;
  isLoading: boolean;
  isSticky?: boolean;
  checkoutButtonRef?: RefObject<HTMLDivElement>;
  isPaymentMethodRequired: boolean;
  isSelectedPlanTrialable: boolean;
  setCheckoutStage?: (stage: string) => void;
  trialPaymentMethodRequired: boolean;
  shouldTrial: boolean;
  willTrialWithoutPaymentMethod: boolean;
  willScheduleDowngrade: boolean;
};

export const CheckoutStageButton = ({
  canCheckout,
  checkout,
  checkoutStage,
  checkoutStages,
  hasPaymentMethod,
  hasPlan,
  inEditMode,
  isLoading,
  isSticky = false,
  isPaymentMethodRequired,
  isSelectedPlanTrialable,
  setCheckoutStage,
  trialPaymentMethodRequired,
  shouldTrial,
  willTrialWithoutPaymentMethod,
  willScheduleDowngrade,
}: CheckoutStageButtonProps) => {
  const { t } = useTranslation();

  const isDisabled = isLoading || !hasPlan || inEditMode || !canCheckout;

  // Helper to get the next stage after the current one
  const getNextStageId = (currentStageId: string): string | undefined => {
    if (!checkoutStages) return undefined;
    const currentIndex = checkoutStages.findIndex(
      (s) => s.id === currentStageId,
    );
    return checkoutStages[currentIndex + 1]?.id;
  };

  // Helper to get stage display name
  const getStageDisplayName = (stageId: string | undefined): string => {
    switch (stageId) {
      case "usage":
        return t("Quantity");
      case "addons":
        return t("Add-ons");
      case "addonsUsage":
        return t("Add-ons Quantity");
      case "credits":
        return t("Credits");
      case "checkout":
        return t("Checkout");
      default:
        return t("Checkout");
    }
  };

  if (checkoutStage === "plan") {
    const nextStage = getNextStageId("plan");

    if (isSelectedPlanTrialable && trialPaymentMethodRequired && shouldTrial) {
      return (
        <Button
          type="button"
          disabled={isDisabled}
          onClick={async () => {
            setCheckoutStage?.("checkout");
          }}
          $fullWidth
          $isLoading={isLoading}
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

    if (!isPaymentMethodRequired && !nextStage) {
      return (
        <NoPaymentRequired
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={checkout}
          isSticky={isSticky}
        />
      );
    }

    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={async () => {
          setCheckoutStage?.(nextStage ?? "checkout");
        }}
        $size={isSticky ? "sm" : "md"}
        $fullWidth
        $isLoading={isLoading}
      >
        <Flex $gap="0.5rem" $justifyContent="center" $alignItems="center">
          {t("Next")}: {getStageDisplayName(nextStage)}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "usage") {
    const nextStage = getNextStageId("usage");

    if (!isPaymentMethodRequired && !nextStage) {
      return (
        <NoPaymentRequired
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={checkout}
          isSticky={isSticky}
        />
      );
    }

    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={async () => {
          setCheckoutStage?.(nextStage ?? "checkout");
        }}
        $size={isSticky ? "sm" : "md"}
        $fullWidth
        $isLoading={isLoading}
      >
        <Flex
          $gap="0.5rem"
          $justifyContent="center"
          $alignItems="center"
          $padding="0 1rem"
        >
          {t("Next")}: {getStageDisplayName(nextStage)}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "addons") {
    const nextStage = getNextStageId("addons");

    if (!isPaymentMethodRequired && !nextStage) {
      return (
        <NoPaymentRequired
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={checkout}
          isSticky={isSticky}
        />
      );
    }

    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={async () => {
          setCheckoutStage?.(nextStage ?? "checkout");
        }}
        $fullWidth
        $isLoading={isLoading}
      >
        <Flex
          $gap="0.5rem"
          $justifyContent="center"
          $alignItems="center"
          $padding="0 1rem"
        >
          {t("Next")}: {getStageDisplayName(nextStage)}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "addonsUsage") {
    const nextStage = getNextStageId("addonsUsage");

    if (!isPaymentMethodRequired && !nextStage) {
      return (
        <NoPaymentRequired
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={checkout}
          isSticky={isSticky}
        />
      );
    }

    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={async () => {
          setCheckoutStage?.(nextStage ?? "checkout");
        }}
        $size={isSticky ? "sm" : "md"}
        $fullWidth
        $isLoading={isLoading}
      >
        <Flex
          $gap="0.5rem"
          $justifyContent="center"
          $alignItems="center"
          $padding="0 1rem"
        >
          {t("Next")}: {getStageDisplayName(nextStage)}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "credits") {
    if (!isPaymentMethodRequired) {
      return (
        <NoPaymentRequired
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={checkout}
          isSticky={isSticky}
        />
      );
    }

    return (
      <Button
        type="button"
        disabled={isDisabled}
        onClick={async () => {
          setCheckoutStage?.("checkout");
        }}
        $fullWidth
        $isLoading={isLoading}
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
      return (
        <NoPaymentRequired
          isDisabled={isDisabled}
          isLoading={isLoading}
          onClick={checkout}
          isSticky={isSticky}
        />
      );
    }

    return (
      <Button
        type="button"
        disabled={isDisabled || !hasPaymentMethod}
        onClick={checkout}
        $fullWidth
        $isLoading={isLoading}
      >
        {willScheduleDowngrade
          ? t("Schedule downgrade")
          : willTrialWithoutPaymentMethod
            ? t("Start trial")
            : t("Pay now")}
      </Button>
    );
  }
};
