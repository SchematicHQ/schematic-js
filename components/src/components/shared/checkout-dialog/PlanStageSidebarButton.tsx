import type {
  CompanyPlanDetailResponseData,
} from "../../../api";
import { EmbedButton } from "../../ui";
import { Flex } from "../../ui";
import { Icon } from "../../ui";
import { useTranslation } from "react-i18next";


type PlanStageSidebarButtonProps = {
  checkout: () => Promise<void>,
  addOns: CompanyPlanDetailResponseData[],
  canUpdateSubscription: boolean,
  setupPaymentAttempt: () => void,
  setCheckoutStage: (stage: "checkout" | "addons") => void,
  selectedPlan?: CompanyPlanDetailResponseData,
  isLoading: boolean,
  trialPaymentMethodRequired?: boolean,
}

export const PlanStageSidebarButton = ({checkout, addOns, canUpdateSubscription, setupPaymentAttempt, setCheckoutStage, selectedPlan, isLoading, trialPaymentMethodRequired }: PlanStageSidebarButtonProps) => {

  const { t } = useTranslation();

  if (!selectedPlan?.companyCanTrial) {
    return (
      <EmbedButton
        disabled={!addOns.length && !canUpdateSubscription}
        onClick={async () => {
          setupPaymentAttempt();

          setCheckoutStage((addOns.length) ? "addons" : "checkout");
        }}
        isLoading={isLoading}
      >
        <Flex
          $gap="0.5rem"
          $justifyContent="center"
          $alignItems="center"
          $padding="0 1rem"
        >
          {t("Next")}: {addOns.length ? t("Addons") : t("Checkout")}
          <Icon name="arrow-right" />
        </Flex>
      </EmbedButton>
    )
  } else if (trialPaymentMethodRequired) {
    return (<EmbedButton
      disabled={!addOns.length && !canUpdateSubscription}
      onClick={async () => {
        setupPaymentAttempt();

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
    </EmbedButton>)
  } else {
    return (           
      <EmbedButton
          disabled={!canUpdateSubscription}
          onClick={async () => {
            setupPaymentAttempt();
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
      )
  }
}