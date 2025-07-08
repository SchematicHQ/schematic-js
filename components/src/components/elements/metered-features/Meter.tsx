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

  const { currentTier } = useMemo(
    () => getUsageDetails(entitlement, period),
    [entitlement, period],
  );

  // check conditions required for showing the meter
  if (typeof usage !== "number" || !currentTier?.to) {
    return null;
  }

  const meter = (
    <ProgressBar
      progress={
        (Math.min(usage, currentTier.to) / Math.max(usage, currentTier.to)) *
        100
      }
      value={usage}
      total={currentTier.to}
      {...(priceBehavior === "overage"
        ? { color: "blue", bgColor: "#2563EB80" }
        : {
            color:
              progressColorMap[
                Math.floor(
                  (Math.min(usage, currentTier.to) / currentTier.to) *
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
