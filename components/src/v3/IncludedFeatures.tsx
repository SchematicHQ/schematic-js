import {
  deriveUsage,
  useFeatureUsage,
  useSchematicLocale,
} from "@schematichq/schematic-react";
import React, { useMemo } from "react";

import { StatusFrame, cx, pickVisible } from "./common";

export interface IncludedFeaturesProps {
  className?: string;
  /** BCP 47 locale for formatting; the provider's locale, then the browser's, if omitted. */
  locale?: string;
  /** Feature IDs to show, in order; omitted, every feature renders. */
  visibleFeatures?: string[];
}

/**
 * The features included in the company's plan with their current usage as
 * text rows (see MeteredFeatures for progress meters). Requires an access
 * token.
 */
export const IncludedFeatures: React.FC<IncludedFeaturesProps> = ({
  className,
  locale: localeProp,
  visibleFeatures,
}) => {
  const { data, error, isPending, refetch } = useFeatureUsage();
  const providerLocale = useSchematicLocale();
  const locale = localeProp ?? providerLocale;

  const rows = useMemo(
    () =>
      pickVisible(data ?? [], visibleFeatures, (row) => row.featureId).map(
        (row) => ({
          key: row.planEntitlementId ?? row.companyOverrideId ?? row.featureId,
          summary: deriveUsage(row, { locale }),
        }),
      ),
    [data, locale, visibleFeatures],
  );

  return (
    <StatusFrame
      className={cx("schematic-included-features", className)}
      error={error}
      hasData={data !== undefined}
      isPending={isPending}
      onRetry={() => void refetch()}
    >
      {rows.length === 0 ? (
        <span className="schematic-muted">No features</span>
      ) : (
        rows.map(({ key, summary }) => {
          const usage =
            summary.limit !== undefined
              ? `${summary.formattedUsed} / ${summary.formattedLimit}`
              : summary.entitlement.kind === "unlimited"
                ? `${summary.formattedUsed} / Unlimited`
                : summary.featureType === "boolean"
                  ? "Included"
                  : summary.formattedUsed;
          return (
            <div className="schematic-row" key={key}>
              <span>{summary.featureName}</span>
              <span className="schematic-muted">{usage}</span>
            </div>
          );
        })
      )}
    </StatusFrame>
  );
};
