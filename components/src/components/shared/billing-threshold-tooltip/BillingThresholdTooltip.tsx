import { useTranslation } from "react-i18next";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { formatCurrency } from "../../../utils";
import { Icon, Text, Tooltip } from "../../ui";

interface BillingThresholdTooltipProps {
  billingThreshold: number;
}

export const BillingThresholdTooltip = ({
  billingThreshold,
}: BillingThresholdTooltipProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  return (
    <Tooltip
      content={
        <Text $size={0.875 * settings.theme.typography.text.fontSize}>
          {t(
            "An invoice is created when charges reach $X; the rest is billed monthly.",
            {
              amount: formatCurrency(billingThreshold),
            },
          )}
        </Text>
      }
      trigger={
        <Icon
          title="billing threshold"
          name="info-rounded"
          color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
        />
      }
    />
  );
};
