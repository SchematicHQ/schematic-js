import { useTranslation } from "react-i18next";

import { type FeatureResponseData } from "../../../api/checkoutexternal";
import { useIsLightBackground } from "../../../hooks";
import { getFeatureName } from "../../../utils";
import { Icon, Text, Tooltip } from "../../ui";

interface OverageTooltipProps {
  feature?: FeatureResponseData;
  limit?: number | null;
  portal?: HTMLElement | null;
}

export const OverageTooltip = ({
  feature,
  limit,
  portal,
}: OverageTooltipProps) => {
  const { t } = useTranslation();

  const isLightBackground = useIsLightBackground();

  if (!feature || typeof limit !== "number") {
    return null;
  }

  return (
    <Tooltip
      trigger={
        <Icon
          title="overage pricing"
          name="info-rounded"
          color={`hsla(0, 0%, ${isLightBackground ? 0 : 100}%, 0.5)`}
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
      portal={portal}
    />
  );
};
