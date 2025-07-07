import { useMemo } from "react";
import { useTranslation } from "react-i18next";

import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { useEmbed } from "../../../hooks";
import { formatNumber, getFeatureName, getUsageDetails } from "../../../utils";
import { ProgressBar, Text, Tooltip, progressColorMap } from "../../ui";

interface MeterProps {
  entitlement: FeatureUsageResponseData;
  period?: string;
}

export const Meter = ({ entitlement, period }: MeterProps) => {
  const { t } = useTranslation();

  const { settings } = useEmbed();

  const { feature, priceBehavior, usage, allocation } = entitlement;

  const { limit } = useMemo(
    () => getUsageDetails(entitlement, period),
    [entitlement, period],
  );

  const showMeter =
    typeof usage === "number" && typeof limit === "number" && limit > 0;

  if (!showMeter) {
    return null;
  }

  const meter = (
    <ProgressBar
      progress={(Math.min(usage, limit) / Math.max(usage, limit)) * 100}
      value={usage}
      total={limit}
      {...(priceBehavior === "overage"
        ? { color: "blue", bgColor: "#2563EB80" }
        : {
            color:
              progressColorMap[
                Math.floor(
                  (Math.min(usage, limit) / limit) *
                    (progressColorMap.length - 1),
                )
              ],
          })}
    />
  );

  const showWithTooltip =
    typeof feature !== "undefined" && typeof allocation === "number";

  if (showWithTooltip) {
    return (
      <Tooltip
        trigger={meter}
        content={
          <Text
            $size={0.875 * settings.theme.typography.text.fontSize}
            $leading={1}
          >
            {t("Up to a limit of", {
              amount: formatNumber(allocation),
              units: getFeatureName(feature),
            })}
          </Text>
        }
        $flexGrow={1}
      />
    );
  }

  return meter;
};
