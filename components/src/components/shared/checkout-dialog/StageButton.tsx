import type { SetupIntentResponseData } from "../../../api";
import { useEmbed } from "../../../hooks";
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
  setSetupIntent: (intent: SetupIntentResponseData | undefined) => void;
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
  setSetupIntent,
  trialPaymentMethodRequired,
}: StageButtonProps) => {
  const { t } = useTranslation();

  const { api, data } = useEmbed();

  const getPaymentIntent = async () => {
    if (api && data.component?.id) {
      const { data: setupIntent } = await api.getSetupIntent({
        componentId: data.component.id,
      });
      setSetupIntent(setupIntent);
    }
  };

  if (checkoutStage === "plan") {
    if (canTrial) {
      if (trialPaymentMethodRequired) {
        return (
          <EmbedButton
            disabled={!hasAddOns && !canUpdateSubscription}
            onClick={async () => {
              getPaymentIntent();
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
            getPaymentIntent();
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
          if (!hasAddOns && !hasPayInAdvanceEntitlements) {
            getPaymentIntent();
          }

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
          if (!hasAddOns) {
            getPaymentIntent();
          }

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
          getPaymentIntent();
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
