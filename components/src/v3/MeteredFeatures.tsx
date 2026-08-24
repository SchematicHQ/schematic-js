import {
  deriveUsage,
  useFeatureUsage,
  useSchematicLocale,
  type UsageSummary,
} from "@schematichq/schematic-react";
import React, { useMemo } from "react";

import { StatusFrame, cx, pickVisible } from "./common";

export interface MeteredFeaturesProps {
  className?: string;
  locale?: string;
  /**
   * Feature IDs to show, in order; omitted, every metered feature renders
   * in server order.
   */
  visibleFeatures?: string[];
  /**
   * Percent at which meters turn amber before the limit. When given it
   * wins over the entitlement's own warning threshold; omitted, that
   * threshold applies, then 90%.
   */
  warningPercent?: number;
}

export const Meter: React.FC<{ meter: UsageSummary }> = ({ meter }) => {
  return (
    <div className={`schematic-meter schematic-meter--${meter.state}`}>
      <div className="schematic-meter__labels">
        <span>{meter.featureName}</span>
        <span>
          {meter.formattedUsed}
          {meter.formattedLimit !== undefined && ` / ${meter.formattedLimit}`}
        </span>
      </div>
      {meter.percent !== undefined && (
        <div
          aria-label={meter.featureName}
          aria-valuemax={100}
          aria-valuemin={0}
          aria-valuenow={Math.round(meter.percent)}
          className="schematic-meter__bar"
          role="progressbar"
        >
          <div
            className="schematic-meter__fill"
            style={{ width: `${meter.percent}%` }}
          />
        </div>
      )}
      {meter.formattedResetsAt !== undefined && (
        <span className="schematic-muted">
          Resets {meter.formattedResetsAt}
        </span>
      )}
    </div>
  );
};

/**
 * Usage meters for the company's metered (event/trait) features. Requires
 * an access token.
 */
export const MeteredFeatures: React.FC<MeteredFeaturesProps> = ({
  className,
  locale: localeProp,
  visibleFeatures,
  warningPercent,
}) => {
  const { data, error, isPending, refetch } = useFeatureUsage();
  const providerLocale = useSchematicLocale();
  const locale = localeProp ?? providerLocale;

  const meters = useMemo(() => {
    const metered = (data ?? []).filter(
      (row) => row.featureType === "event" || row.featureType === "trait",
    );
    return pickVisible(metered, visibleFeatures, (row) => row.featureId).map(
      (row) => ({
        key: row.planEntitlementId ?? row.companyOverrideId ?? row.featureId,
        meter: deriveUsage(row, { locale, warningPercent }),
      }),
    );
  }, [data, locale, visibleFeatures, warningPercent]);

  return (
    <StatusFrame
      className={cx("schematic-metered-features", className)}
      error={error}
      hasData={data !== undefined}
      isPending={isPending}
      onRetry={() => void refetch()}
    >
      {meters.length === 0 ? (
        <span className="schematic-muted">No metered features</span>
      ) : (
        meters.map(({ key, meter }) => <Meter key={key} meter={meter} />)
      )}
    </StatusFrame>
  );
};
