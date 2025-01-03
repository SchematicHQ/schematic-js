import { EmbedButton } from "../../ui";
import { Flex } from "../../ui";
import { Icon } from "../../ui";
import { useTranslation } from "react-i18next";

type StageButtonProps = {
  canTrial: boolean;
  canCheckout: boolean;
  canUpdateSubscription: boolean;
  checkout: () => Promise<void>;
  checkoutStage: string;
  hasAddOns: boolean;
  hasPayInAdvanceEntitlements: boolean;
  isLoading: boolean;
  setCheckoutStage: (stage: string) => void;
  trialPaymentMethodRequired: boolean;
};

export const StageButton = ({
  canTrial,
  canCheckout,
  canUpdateSubscription,
  checkout,
  checkoutStage,
  hasAddOns,
  hasPayInAdvanceEntitlements,
  isLoading,
  setCheckoutStage,
  trialPaymentMethodRequired,
}: StageButtonProps) => {
  const { t } = useTranslation();

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
            {t("Checkout Trial")}
            <Icon name="arrow-right" />
          </Flex>
        </EmbedButton>
      );
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
    return (
      <EmbedButton
        disabled={isLoading || !canCheckout}
        onClick={checkout}
        isLoading={isLoading}
      >
        {t("Pay now")}
      </EmbedButton>
    );
  }
};
