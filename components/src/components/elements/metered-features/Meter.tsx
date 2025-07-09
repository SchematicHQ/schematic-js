import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { type TUsageDetails } from "../../../utils";
import { ProgressBar, progressColorMap } from "../../ui";

interface MeterProps {
  entitlement: FeatureUsageResponseData;
  usageDetails: TUsageDetails;
  period?: string;
}

export const Meter = ({ entitlement, usageDetails }: MeterProps) => {
  const { priceBehavior, usage } = entitlement;
  const limit = usageDetails.limit ?? usageDetails.currentTier?.to;

  console.debug(usage, limit);

  // check conditions required for showing the meter
  if (typeof usage !== "number" || !limit || limit === Infinity) {
    return null;
  }

  const meter = (
    <ProgressBar
      progress={(Math.min(usage, limit) / Math.max(usage, limit)) * 100}
      value={usage}
      total={limit}
      {...(priceBehavior === "overage" || priceBehavior === "tier"
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
