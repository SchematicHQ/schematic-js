import { RefObject } from "react";
import { useTranslation } from "react-i18next";

import { Button, Flex, Icon } from "../../ui";
import { type CheckoutStage } from "../checkout-dialog";

type NoPaymentRequiredProps = {
  isDisabled: boolean;
  isLoading: boolean;
  isSticky?: boolean;
  onClick: () => Promise<void>;
};

const NoPaymentRequired = ({
  isDisabled,
  isLoading,
  isSticky = false,
  onClick,
}: NoPaymentRequiredProps) => {
  const { t } = useTranslation();

  return (
    <Button
      type="button"
      disabled={isDisabled}
      onClick={onClick}
      $isLoading={isLoading}
      $size={isSticky ? "sm" : "md"}
      $fullWidth
    >
      {t("Subscribe and close")}
    </Button>
  );
};

type StageButtonProps = {
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
};

export const StageButton = ({
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
}: StageButtonProps) => {
  const { t } = useTranslation();

  const isDisabled = isLoading || !hasPlan || inEditMode;

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
        return t("Usage");
      case "addons":
        return t("Addons");
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
        $isLoading={isLoading}
        $fullWidth
        $size={isSticky ? "sm" : "md"}
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
        $isLoading={isLoading}
        $fullWidth
        $size={isSticky ? "sm" : "md"}
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
        $isLoading={isLoading}
        $fullWidth
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
        $isLoading={isLoading}
        $fullWidth
        $size={isSticky ? "sm" : "md"}
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
        $isLoading={isLoading}
        $fullWidth
      >
        {willTrialWithoutPaymentMethod ? t("Start trial") : t("Pay now")}
      </Button>
    );
  }
};
