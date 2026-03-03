import { type FeatureUsageResponseData } from "../../../api/checkoutexternal";
import { PriceBehavior } from "../../../const";
import { ProgressBar, progressColorMap } from "../../ui";

interface MeterProps {
  entitlement: FeatureUsageResponseData;
  period?: string;
}

export const Meter = ({ entitlement }: MeterProps) => {
  const { allocation, priceBehavior, softLimit, usage } = entitlement;
  const limit = softLimit ?? allocation;

  // check conditions required for showing the meter
  if (typeof usage !== "number" || typeof limit !== "number") {
    return null;
  }

  // `limit` is a soft limit in the case of overage price behavior
  // we need to display progress differently (but only) in this case
  const progress =
    (priceBehavior === PriceBehavior.Overage && usage > limit
      ? Math.min(usage, limit) / Math.max(usage, limit)
      : usage / limit) * 100;

  const meter = (
    <ProgressBar
      progress={progress}
      value={usage}
      total={limit}
      {...(priceBehavior === PriceBehavior.Tiered
        ? { color: "blue", bgColor: "#2563EB80" }
        : priceBehavior === PriceBehavior.Overage && usage > limit
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
