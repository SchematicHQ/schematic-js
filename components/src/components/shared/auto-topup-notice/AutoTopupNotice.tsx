import { useTranslation } from "react-i18next";

import { type PlanCreditGrantView } from "../../../api/checkoutexternal";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Icon, Text, Tooltip } from "../../ui";

interface AutoTopupNoticeProps {
  planCreditGrant: PlanCreditGrantView;
  portal?: HTMLElement | null;
}

export const AutoTopupNotice = ({
  planCreditGrant,
  portal,
}: AutoTopupNoticeProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  if (
    typeof planCreditGrant.billingCreditAutoTopupThresholdCredits !== "number" ||
    typeof planCreditGrant.billingCreditAutoTopupAmount !== "number"
  ) {
    return null;
  }

  return (
    <Tooltip
      trigger={
        <Icon
          title="auto top-up"
          name="info-rounded"
          color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
          style={{ lineHeight: 0 }}
        />
      }
      content={
        <Text $size={0.875 * settings.theme.typography.text.fontSize}>
          {t(
            "When balance reaches X remaining, an auto top-up of Y credits will be processed.",
            {
              threshold:
                planCreditGrant.billingCreditAutoTopupThresholdCredits,
              amount: planCreditGrant.billingCreditAutoTopupAmount,
            },
          )}
        </Text>
      }
      portal={portal}
    />
  );
};
