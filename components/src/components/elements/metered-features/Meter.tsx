import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { PriceBehavior } from "../../../const";
import { type UsageDetails } from "../../../utils";
import { ProgressBar, progressColorMap } from "../../ui";

interface MeterProps {
  entitlement: FeatureUsageResponseData;
  usageDetails: UsageDetails;
  period?: string;
}

export const Meter = ({ entitlement, usageDetails }: MeterProps) => {
  const { priceBehavior, usage } = entitlement;
  const limit = usageDetails.limit ?? usageDetails.currentTier?.to;

  // check conditions required for showing the meter
  if (typeof usage !== "number" || !limit || limit === Infinity) {
    return null;
  }

  const meter = (
    <ProgressBar
      progress={(Math.min(usage, limit) / Math.max(usage, limit)) * 100}
      value={usage}
      total={limit}
      {...(priceBehavior === PriceBehavior.Overage ||
      priceBehavior === PriceBehavior.Tiered
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

  return meter;
};
