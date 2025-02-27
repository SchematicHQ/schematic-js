import { useTranslation } from "react-i18next";
import { EmbedButton, Flex, Icon } from "../../ui";
import { type CheckoutStage } from "../checkout-dialog";

type StageButtonProps = {
  canTrial: boolean;
  canCheckout: boolean;
  canUpdateSubscription: boolean;
  checkout: () => Promise<void>;
  checkoutStage: string;
  checkoutStages: CheckoutStage[];
  hasAddOns: boolean;
  hasPayInAdvanceEntitlements: boolean;
  isLoading: boolean;
  requiresPayment: boolean;
  setCheckoutStage: (stage: string) => void;
  trialPaymentMethodRequired: boolean;
};

export const StageButton = ({
  canTrial,
  canCheckout,
  canUpdateSubscription,
  checkout,
  checkoutStage,
  checkoutStages,
  hasAddOns,
  hasPayInAdvanceEntitlements,
  isLoading,
  requiresPayment,
  setCheckoutStage,
  trialPaymentMethodRequired,
}: StageButtonProps) => {
  const { t } = useTranslation();

  const NoPaymentRequired = () => {
    return (
      <EmbedButton
        disabled={isLoading || !canCheckout}
        onClick={checkout}
        isLoading={isLoading}
      >
        {t("Subscribe and close")}
      </EmbedButton>
    );
  };

  if (checkoutStage === "plan") {
    if (canTrial) {
      if (trialPaymentMethodRequired) {
        return (
          <EmbedButton
            disabled={!hasAddOns && !canUpdateSubscription}
            onClick={async () => {
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
        );
      }

      return (
        <EmbedButton
          disabled={!canUpdateSubscription}
          onClick={async () => {
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
            {t("Subscribe and close")}
            <Icon name="arrow-right" />
          </Flex>
        </EmbedButton>
      );
    }

    if (
      !requiresPayment &&
      !checkoutStages.some(
        (stage) => stage.id === "addons" || stage.id === "usage",
      )
    ) {
      return <NoPaymentRequired />;
    }

    return (
      <EmbedButton
        disabled={!canUpdateSubscription}
        onClick={async () => {
          setCheckoutStage(
            hasPayInAdvanceEntitlements
              ? "usage"
              : hasAddOns
                ? "addons"
                : "checkout",
          );
        }}
        isLoading={isLoading}
      >
        <Flex
          $gap="0.5rem"
          $justifyContent="center"
          $alignItems="center"
          $padding="0 1rem"
        >
          {t("Next")}:{" "}
          {hasPayInAdvanceEntitlements
            ? t("Usage")
            : hasAddOns
              ? t("Addons")
              : t("Checkout")}
          <Icon name="arrow-right" />
        </Flex>
      </EmbedButton>
    );
  }

  if (checkoutStage === "usage") {
    if (!requiresPayment) {
      return <NoPaymentRequired />;
    }

    return (
      <EmbedButton
        disabled={!canUpdateSubscription}
        onClick={async () => {
          setCheckoutStage(hasAddOns ? "addons" : "checkout");
        }}
        isLoading={isLoading}
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
      </EmbedButton>
    );
  }

  if (checkoutStage === "addons") {
    if (!requiresPayment) {
      return <NoPaymentRequired />;
    }

    return (
      <EmbedButton
        disabled={!canUpdateSubscription}
        onClick={async () => {
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
    );
  }

  if (checkoutStage === "checkout") {
    if (!requiresPayment) {
      return <NoPaymentRequired />;
    }

    return (
      <EmbedButton
        disabled={isLoading || !canCheckout}
        onClick={checkout}
        isLoading={isLoading}
      >
        {canTrial ? t("Start trial") : t("Pay now")}
      </EmbedButton>
    );
  }
};
