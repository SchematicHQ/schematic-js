import { RefObject } from "react";
import { useTranslation } from "react-i18next";

import { Button, Flex, Icon } from "../../ui";
import { type CheckoutStage } from "../checkout-dialog";

type NoPaymentRequiredProps = {
  isDisabled: boolean;
  isLoading: boolean;
  isSticky: boolean;
  onClick: () => Promise<void>;
};

const NoPaymentRequired = ({
  isDisabled,
  isLoading,
  isSticky,
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
  hasAddOns: boolean;
  hasPayInAdvanceEntitlements: boolean;
  hasCreditBundles: boolean;
  hasPaymentMethod: boolean;
  hasPlan: boolean;
  inEditMode: boolean;
  isLoading: boolean;
  isSticky: boolean;
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
  hasAddOns,
  hasPayInAdvanceEntitlements,
  hasCreditBundles,
  hasPaymentMethod,
  hasPlan,
  inEditMode,
  isLoading,
  isSticky,
  isPaymentMethodRequired,
  isSelectedPlanTrialable,
  setCheckoutStage,
  trialPaymentMethodRequired,
  shouldTrial,
  willTrialWithoutPaymentMethod,
}: StageButtonProps) => {
  const { t } = useTranslation();

  const isDisabled = isLoading || !hasPlan || inEditMode;

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
        (stage) =>
          stage.id === "usage" ||
          stage.id === "addons" ||
          stage.id === "credits",
      )
    ) {
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
          setCheckoutStage?.(
            hasPayInAdvanceEntitlements
              ? "usage"
              : hasAddOns
                ? "addons"
                : hasCreditBundles
                  ? "credits"
                  : "checkout",
          );
        }}
        $isLoading={isLoading}
        $fullWidth
        $size={isSticky ? "sm" : "md"}
      >
        <Flex $gap="0.5rem" $justifyContent="center" $alignItems="center">
          {t("Next")}:{" "}
          {hasPayInAdvanceEntitlements
            ? t("Usage")
            : hasAddOns
              ? t("Addons")
              : hasCreditBundles
                ? t("Credits")
                : t("Checkout")}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "usage") {
    if (
      !isPaymentMethodRequired &&
      !checkoutStages?.some(
        (stage) => stage.id === "addons" || stage.id === "credits",
      )
    ) {
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
          setCheckoutStage?.(
            hasAddOns ? "addons" : hasCreditBundles ? "credits" : "checkout",
          );
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
          {t("Next")}:{" "}
          {hasAddOns
            ? t("Addons")
            : hasCreditBundles
              ? t("Credits")
              : t("Checkout")}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "addons") {
    // Check if there's an addonsUsage stage next
    const hasAddonsUsageStage = checkoutStages?.some(
      (stage) => stage.id === "addonsUsage",
    );
    const hasCreditsStage = checkoutStages?.some(
      (stage) => stage.id === "credits",
    );
    if (!isPaymentMethodRequired && !hasAddonsUsageStage && !hasCreditsStage) {
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
          setCheckoutStage?.(
            hasAddonsUsageStage
              ? "addonsUsage"
              : hasCreditsStage
                ? "credits"
                : "checkout",
          );
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
          {t("Next")}:{" "}
          {hasAddonsUsageStage
            ? t("Add-ons Quantity")
            : hasCreditsStage
              ? t("Credits")
              : t("Checkout")}
          <Icon name="arrow-right" />
        </Flex>
      </Button>
    );
  }

  if (checkoutStage === "addonsUsage") {
    if (
      !isPaymentMethodRequired &&
      !checkoutStages?.some((stage) => stage.id === "credits")
    ) {
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
          setCheckoutStage?.(hasCreditBundles ? "credits" : "checkout");
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
          {t("Next")}: {hasCreditBundles ? t("Credits") : t("Checkout")}
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
