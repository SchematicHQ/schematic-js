import { useTranslation } from "react-i18next";

import { type FeatureResponseData } from "../../../api/checkoutexternal";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { getFeatureName } from "../../../utils";
import { Icon, Text, Tooltip } from "../../ui";

interface HardLimitTooltipProps {
  portal?: HTMLElement | null;
  feature?: FeatureResponseData;
  limit?: number | null;
}

export const HardLimitTooltip = ({
  portal,
  feature,
  limit,
}: HardLimitTooltipProps) => {
  const { t } = useTranslation();

  const { data } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const showHardLimit = data?.displaySettings?.showHardLimit ?? false;

  if (!showHardLimit || !feature || typeof limit !== "number") {
    return null;
  }

  return (
    <Tooltip
      portal={portal}
      trigger={
        <Icon
          title="limit"
          name="info-rounded"
          color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
          style={{ lineHeight: 0 }}
        />
      }
      content={
        <Text>
          {t("Up to a limit of", {
            amount: limit,
            units: getFeatureName(feature, limit),
          })}
        </Text>
      }
    />
  );
};
