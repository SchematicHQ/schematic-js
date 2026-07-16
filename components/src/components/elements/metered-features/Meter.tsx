import {
  EntitlementPriceBehavior,
  type FeatureUsageResponseData,
} from "../../../api/checkoutexternal";
import { getEntitlementWarningThreshold } from "../../../utils";
import { ProgressBar, progressColorMap } from "../../ui";

interface MeterProps {
  entitlement: FeatureUsageResponseData;
  period?: string;
  /**
   * When true, use the entitlement's configured warning threshold as the meter's
   * limit (matching the displayed limit in a fair-use setup), falling back to the
   * hard limit when no threshold is set.
   */
  showWarningThresholdAsLimit?: boolean;
}

export const Meter = ({
  entitlement,
  showWarningThresholdAsLimit,
}: MeterProps) => {
  const { allocation, priceBehavior, softLimit, usage } = entitlement;
  const warningThreshold = getEntitlementWarningThreshold(
    entitlement.planEntitlement?.warningTiers,
  );
  const limit =
    showWarningThresholdAsLimit && typeof warningThreshold === "number"
      ? warningThreshold
      : (softLimit ?? allocation);

  // check conditions required for showing the meter
  if (typeof usage !== "number" || typeof limit !== "number") {
    return null;
  }

  // `limit` is a soft limit in the case of overage price behavior
  // we need to display progress differently (but only) in this case
  const progress =
    (priceBehavior === EntitlementPriceBehavior.Overage && usage > limit
      ? Math.min(usage, limit) / Math.max(usage, limit)
      : usage / limit) * 100;

  const meter = (
    <ProgressBar
      progress={progress}
      value={usage}
      total={limit}
      {...(priceBehavior === EntitlementPriceBehavior.Tier
        ? { color: "blue", bgColor: "#2563EB80" }
        : priceBehavior === EntitlementPriceBehavior.Overage && usage > limit
          ? { color: "blue", bgColor: "#FFAA06" }
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

  return meter;
};
