import { useTranslation } from "react-i18next";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Icon, Text, Tooltip } from "../../ui";

interface AutoTopupNoticeProps {
  thresholdCredits?: number | null;
  topupAmount?: number | null;
  portal?: HTMLElement | null;
}

export const AutoTopupNotice = ({
  thresholdCredits,
  topupAmount,
  portal,
}: AutoTopupNoticeProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const isLightBackground = useIsLightBackground();

  if (typeof thresholdCredits !== "number" || typeof topupAmount !== "number") {
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
              threshold: thresholdCredits,
              amount: topupAmount,
            },
          )}
        </Text>
      }
      portal={portal}
    />
  );
};
