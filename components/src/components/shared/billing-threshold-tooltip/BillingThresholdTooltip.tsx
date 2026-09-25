import { useEmbed, useIsLightBackground } from "../../../hooks";
import { useTranslation } from "../../../localization";
import { formatCurrency } from "../../../utils";
import { Icon, Text, Tooltip } from "../../ui";

interface BillingThresholdTooltipProps {
  portal?: HTMLElement | null;
  billingThreshold: number;
}

export const BillingThresholdTooltip = ({
  portal,
  billingThreshold,
}: BillingThresholdTooltipProps) => {
  const { t, locale } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  return (
    <Tooltip
      portal={portal}
      content={
        <Text $size={0.875 * settings.theme.typography.text.fontSize}>
          {t(
            "An invoice is created when charges reach $X; the rest is billed monthly.",
            {
              amount: formatCurrency(billingThreshold, { locale }),
            },
          )}
        </Text>
      }
      trigger={
        <Icon
          title={t("Billing threshold")}
          name="info-rounded"
          color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
          style={{ lineHeight: 0 }}
        />
      }
    />
  );
};
