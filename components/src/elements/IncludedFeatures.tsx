import { useFeatureUsage } from "@schematichq/schematic-react";
import { useMemo, useState } from "react";

import {
  StatusFrame,
  Tooltip,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import {
  deriveIncludedFeatures,
  httpStatus,
  type EntitlementText,
  type IncludedFeatureRow,
  type UsageSegment,
  type UsageSummary,
} from "./model";
import type { Translator } from "./strings";
import { PriceTiers, shortPeriod } from "./usage";

/** Rows shown before "See all". */
const VISIBLE_FEATURE_COUNT = 4;

export interface IncludedFeaturesProps extends ElementProps {
  /** The "Included features" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /** Each feature's icon, where it has one. Default true. */
  showIcons?: boolean;
  /** Each feature's description. Default true. */
  showDescription?: boolean;
  /** When a company override ends. Default true. */
  showExpiration?: boolean;
  /** What the company gets: its allocation, price, or tier. Default true. */
  showEntitlement?: boolean;
  /** What the company has used, what it costs, and when it resets. Default true. */
  showUsage?: boolean;
  /** Feature ids to show, in this order; every feature when absent. */
  visibleFeatures?: string[];
  /** The "credits per use" line on credit-burning features. Default true. */
  showCredits?: boolean;
  /** An info tip with the hard limit on features billed past it. Default false. */
  showHardLimit?: boolean;
  /**
   * Show an entitlement's warning threshold in place of its limit, where one
   * is configured. Default false.
   */
  showWarningThresholdAsLimit?: boolean;
}

/**
 * Every feature the company is entitled to: what it gets, what it has used,
 * and, for a priced feature, what that costs.
 *
 * A company entitled to nothing gets the heading over an empty list. A 404
 * means the account is not enabled for company reads, and the card says so.
 */
export function IncludedFeatures({
  className,
  headingLevel = 2,
  locale: localeProp,
  showCredits = true,
  showDescription = true,
  showEntitlement = true,
  showExpiration = true,
  showHardLimit = false,
  showHeader = true,
  showIcons = true,
  showUsage = true,
  showWarningThresholdAsLimit = false,
  strings,
  visibleFeatures,
}: IncludedFeaturesProps) {
  const { data: features, error, isPending, refetch } = useFeatureUsage();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);
  const [expanded, setExpanded] = useState(false);

  const rows = useMemo(
    () =>
      features === undefined
        ? []
        : deriveIncludedFeatures(features, {
            locale,
            showCredits,
            showWarningThresholdAsLimit,
            visibleFeatures,
          }),
    [
      features,
      locale,
      showCredits,
      showWarningThresholdAsLimit,
      visibleFeatures,
    ],
  );

  const Heading = `h${headingLevel}` as const;
  const canExpand = rows.length > VISIBLE_FEATURE_COUNT;
  const shown =
    canExpand && !expanded ? rows.slice(0, VISIBLE_FEATURE_COUNT) : rows;

  const unavailable = features === undefined && httpStatus(error) === 404;
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("includedFeaturesUnavailable")
        : t("includedFeaturesError");

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-included-features", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={features !== undefined}
      isPending={isPending}
      loadingLabel={t("includedFeaturesLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={<IncludedFeaturesSkeleton showHeader={showHeader} />}
    >
      {showHeader && (
        <div className="schematic-header">
          <Heading className="schematic-header__title">
            {t("includedFeaturesHeader")}
          </Heading>
        </div>
      )}
      <ul className="schematic-included-features__list">
        {shown.map((row) => (
          <li
            className="schematic-included-features__row"
            data-testid="schematic-included-feature"
            key={row.featureId}
          >
            {showIcons && row.icon !== null && (
              <i
                aria-hidden="true"
                className={`schematic-icon schematic-icon--${row.icon} schematic-included-features__icon`}
              />
            )}
            <div className="schematic-included-features__details">
              <span className="schematic-included-features__name">
                {row.name}
              </span>
              {showDescription && row.description !== null && (
                <span className="schematic-muted schematic-small">
                  {row.description}
                </span>
              )}
              {row.perLicenseCredits.map((credits, index) => (
                <span
                  className="schematic-muted schematic-small"
                  key={`${credits.creditName}-${index}`}
                >
                  {t("includedFeaturesPerLicense", {
                    amount: credits.amount,
                    creditName: credits.creditName,
                    licenseName: credits.licenseName,
                  })}
                </span>
              ))}
              {showExpiration && row.expiresAt !== null && (
                <em className="schematic-muted schematic-small">
                  {t("includedFeaturesExpires", { date: row.expiresAt.text })}
                </em>
              )}
            </div>
            <UsageDetails
              row={row}
              showEntitlement={showEntitlement}
              showHardLimit={showHardLimit}
              showUsage={showUsage}
              t={t}
              locale={locale}
            />
          </li>
        ))}
      </ul>
      {canExpand && (
        <button
          aria-expanded={expanded}
          className="schematic-link-button schematic-included-features__toggle"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          <i
            aria-hidden="true"
            className={`schematic-icon schematic-icon--${expanded ? "chevron-up" : "chevron-down"}`}
          />
          {expanded
            ? t("includedFeaturesHideAll")
            : t("includedFeaturesSeeAll")}
        </button>
      )}
    </StatusFrame>
  );
}

/** What the company gets, and what it has used, on the right of a row. */
function UsageDetails({
  locale,
  row,
  showEntitlement,
  showHardLimit,
  showUsage,
  t,
}: {
  locale: string;
  row: IncludedFeatureRow;
  showEntitlement: boolean;
  showHardLimit: boolean;
  showUsage: boolean;
  t: Translator;
}) {
  const usage = usageText(row.usage, row.usageSummary, t);
  if (row.entitlement === null && usage === null) {
    return null;
  }
  return (
    <div className="schematic-included-features__usage">
      {showEntitlement && row.entitlement !== null && (
        <span className="schematic-included-features__entitlement">
          {entitlementText(row.entitlement, t)}
          {showHardLimit && row.hardLimit !== null && (
            <Tooltip label={t("usageHardLimitLabel")}>
              {t("usageHardLimit", {
                amount: row.hardLimit.amount,
                units: row.hardLimit.units,
              })}
            </Tooltip>
          )}
        </span>
      )}
      {showUsage && usage !== null && (
        <span className="schematic-muted schematic-small schematic-included-features__used">
          {usage}
          {row.tiers !== null && row.tiers.ranges.length > 0 && (
            <Tooltip label={t("usageTieredPricingLabel")}>
              <PriceTiers
                currency={row.tiers.currency}
                locale={locale}
                mode={row.tiers.mode}
                period={row.tiers.period}
                ranges={row.tiers.ranges}
                t={t}
                unit={row.source.featureSingularName ?? row.name}
              />
            </Tooltip>
          )}
        </span>
      )}
    </div>
  );
}

function entitlementText(text: EntitlementText, t: Translator): string {
  switch (text.kind) {
    case "units":
      return t("usageUnits", { amount: text.amount, units: text.units });
    case "perUnit":
      return t("usagePerUnit", { cost: text.cost, unit: text.unit });
    case "perPackage":
      return t("usagePerPackage", {
        cost: text.cost,
        size: text.size,
        units: text.units,
      });
    case "tierUpTo":
      return t("usageTierUpTo", { amount: text.amount, feature: text.feature });
    case "tierUnlimited":
      return t("usageTierUnlimited", { feature: text.feature });
    case "perUse":
      return t("usagePerUse", { amount: text.amount, units: text.units });
    case "unlimited":
      return t("usageUnlimited", { item: text.item });
  }
}

/** The usage line: its segments joined by " • ", else the summary. */
function usageText(
  segments: UsageSegment[],
  summary: UsageSummary | null,
  t: Translator,
): string | null {
  if (segments.length > 0) {
    return segments.map((segment) => segmentText(segment, t)).join(" • ");
  }
  if (summary === null) {
    return null;
  }
  return summary.kind === "limited"
    ? t("usageLimited", {
        amount: summary.amount,
        allocation: summary.allocation,
      })
    : t("usageUnlimitedUsed", { amount: summary.amount });
}

function segmentText(segment: UsageSegment, t: Translator): string {
  switch (segment.kind) {
    case "unitPricePerPeriod": {
      const period = shortPeriod(segment.period, t) ?? segment.period;
      return segment.size > 1
        ? t("usagePackagePricePerPeriod", {
            cost: segment.cost,
            size: segment.size,
            units: segment.units,
            period,
          })
        : t("usageUnitPricePerPeriod", {
            cost: segment.cost,
            unit: segment.units,
            period,
          });
    }
    case "used":
      return t("usageUsed", { amount: segment.amount, units: segment.units });
    case "cost": {
      const period =
        segment.period === null ? undefined : shortPeriod(segment.period, t);
      return period === undefined ? segment.cost : `${segment.cost}/${period}`;
    }
    case "resets":
      return t("usageResets", { date: segment.date });
  }
}

/** A heading bar and a few rows, the loaded card's shape. */
function IncludedFeaturesSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      {[0, 1, 2].map((index) => (
        <div className="schematic-skeleton__row" key={index}>
          <div className="schematic-skeleton__cell" data-column="name" />
          <div className="schematic-skeleton__cell" data-column="usage" />
        </div>
      ))}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
IncludedFeatures.resources = ["featureUsage"] as const;

export default IncludedFeatures;
