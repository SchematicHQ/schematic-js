import {
  useCatalog,
  useCompany,
  useFeatureUsage,
  type FeatureUsageRow,
} from "@schematichq/schematic-react";
import { useMemo } from "react";

import {
  derivePeriod,
  deriveUsage,
  featureName,
  resolveLocale,
  type TierSummary,
  type UsageSummary,
} from "../model";

import {
  Cta,
  Icon,
  Meter,
  StatusFrame,
  cx,
  pickVisible,
  type CtaProps,
  type ElementProps,
} from "./common";
import { allocationText, hardLimitText, perUnitShort } from "./copy";

export interface MeteredFeaturesProps extends ElementProps {
  /** Feature IDs to show, in this order. Default: every metered row, in server order. */
  visibleFeatures?: string[];
  /** The heading. Default true. */
  showHeader?: boolean;
  /** Heading text. Default "Usage". */
  headerText?: string;
  /** Feature icons. Default true. */
  showIcons?: boolean;
  /** Feature descriptions under the name. Default true. */
  showDescription?: boolean;
  /** The allocation line ("10,000 API calls • Resets 9/1"). Default true. */
  showAllocation?: boolean;
  /** The usage line ("8,200 API calls used"). Default true. */
  showUsage?: boolean;
  /** The meter, where one makes sense. Default true. */
  showMeter?: boolean;
  /** Hard-limit disclosure on priced entitlements. Default false. */
  showHardLimit?: boolean;
  /** Show the warning threshold as the limit. Default false. */
  showWarningThresholdAsLimit?: boolean;
  /** Credit facts (consumption rate) rather than the credit-equivalent limit. Default true. */
  showCredits?: boolean;
  /** Percent of the limit at which the meter warns; defaults to the server threshold, else 90. */
  warningPercent?: number;
  /** Called when "Add more" is activated on a pay-in-advance feature. */
  onAddMore?: (row: FeatureUsageRow, summary: UsageSummary) => void;
  /** "Add more" destination; combined with `onAddMore` when both are given. */
  addMoreUrl?: string;
  addMoreTarget?: string;
}

interface MeteredRow {
  row: FeatureUsageRow;
  summary: UsageSummary;
}

/** "8,200 API calls used", or the committed quantity for pay in advance ("5 seats"). */
function meteredUsageText(summary: UsageSummary): string {
  const { usage } = summary;
  if (summary.canAddMore && usage.limit !== null && usage.limitText !== null) {
    return `${usage.limitText} ${featureName(summary.feature, usage.limit)}`;
  }
  return `${usage.usedText} ${usage.unit} used`;
}

/** "10,000 API calls • Resets 9/1", or the unit price and committed cost for pay in advance. */
function meteredAllocationText(summary: UsageSummary): string | null {
  const parts: string[] = [];
  if (summary.canAddMore && summary.unitPrice !== null) {
    parts.push(perUnitShort(summary.unitPrice));
    if (summary.cost !== null) {
      parts.push(
        summary.cost.periodShort === null
          ? summary.cost.text
          : `${summary.cost.text}/${summary.cost.periodShort}`,
      );
    }
  } else {
    const allocation = allocationText(summary.allocation);
    if (allocation !== null) {
      parts.push(allocation);
    }
  }
  if (summary.resetsAt !== null) {
    parts.push(`Resets ${summary.resetsAt.text}`);
  }
  return parts.length === 0 ? null : parts.join(" • ");
}

/** The band the current usage falls in. */
function currentTier(tiers: TierSummary, used: number) {
  return (
    tiers.rows.find(
      (tier) => used >= tier.from && (tier.to === null || used <= tier.to),
    ) ?? tiers.rows[tiers.rows.length - 1]
  );
}

function tierRangeText(tier: { fromText: string; toText: string | null }) {
  return `${tier.fromText}–${tier.toText ?? "∞"}`;
}

/**
 * One card per event or trait feature the company holds, with its usage,
 * allocation, meter, and overage or tier pricing. Needs an access token.
 */
export function MeteredFeatures({
  addMoreTarget,
  addMoreUrl,
  className,
  headerText = "Usage",
  locale: localeProp,
  onAddMore,
  showAllocation = true,
  showCredits = true,
  showDescription = true,
  showHardLimit = false,
  showHeader = true,
  showIcons = true,
  showMeter = true,
  showUsage = true,
  showWarningThresholdAsLimit = false,
  visibleFeatures,
  warningPercent,
}: MeteredFeaturesProps) {
  const usage = useFeatureUsage();
  const company = useCompany();
  const { data: catalog } = useCatalog();
  const locale = resolveLocale(localeProp);

  const subscription = company.data?.subscription ?? null;
  const period =
    subscription === null
      ? null
      : derivePeriod(subscription.interval, subscription.intervalCount);
  const currency = subscription === null ? null : subscription.currency;
  const canCheckout = catalog?.capabilities.checkout ?? false;

  const rows = useMemo<MeteredRow[] | undefined>(() => {
    if (usage.data === undefined) {
      return undefined;
    }
    return pickVisible(usage.data, visibleFeatures, (row) => row.feature.id)
      .map((row) => ({
        row,
        summary: deriveUsage(row, {
          currency,
          locale,
          period,
          showCredits,
          showHardLimit,
          showWarningThresholdAsLimit,
          warningPercent,
        }),
      }))
      .filter(({ summary }) => summary.isMetered);
  }, [
    currency,
    locale,
    period,
    showCredits,
    showHardLimit,
    showWarningThresholdAsLimit,
    usage.data,
    visibleFeatures,
    warningPercent,
  ]);

  // The company supplies the period and currency prices are read at; wait
  // for it rather than render cards without prices and then re-render.
  const companyLoading =
    company.data === undefined &&
    company.error === undefined &&
    company.isPending;

  return (
    <StatusFrame
      className={cx("schematic-metered-features", className)}
      error={usage.error}
      hasData={rows !== undefined && !companyLoading}
      isPending={usage.isPending || companyLoading}
      label="usage"
      onRetry={usage.refetch}
    >
      {rows !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <h2>{headerText}</h2>
            </div>
          )}

          {rows.length === 0 ? (
            <p
              className="schematic-muted schematic-metered-features__empty"
              data-testid="sch-empty"
            >
              No usage to show
            </p>
          ) : (
            <div className="schematic-metered-features__cards">
              {rows.map(({ row, summary }) => (
                <FeatureCard
                  key={
                    row.planEntitlementId ??
                    row.companyOverrideId ??
                    row.feature.id
                  }
                  addMoreTarget={addMoreTarget}
                  addMoreUrl={addMoreUrl}
                  canCheckout={canCheckout}
                  locale={locale}
                  row={row}
                  showAllocation={showAllocation}
                  showDescription={showDescription}
                  showIcons={showIcons}
                  showMeter={showMeter}
                  showUsage={showUsage}
                  summary={summary}
                  onAddMore={onAddMore}
                />
              ))}
            </div>
          )}
        </>
      )}
    </StatusFrame>
  );
}

interface FeatureCardProps extends CtaProps {
  addMoreTarget?: string;
  addMoreUrl?: string;
  canCheckout: boolean;
  locale: string;
  onAddMore?: (row: FeatureUsageRow, summary: UsageSummary) => void;
  row: FeatureUsageRow;
  showAllocation: boolean;
  showDescription: boolean;
  showIcons: boolean;
  showMeter: boolean;
  showUsage: boolean;
  summary: UsageSummary;
}

function FeatureCard({
  addMoreTarget,
  addMoreUrl,
  canCheckout,
  locale,
  onAddMore,
  row,
  showAllocation,
  showDescription,
  showIcons,
  showMeter,
  showUsage,
  summary,
}: FeatureCardProps) {
  const usageLine = showUsage ? meteredUsageText(summary) : null;
  const allocationLine = showAllocation ? meteredAllocationText(summary) : null;
  const hasDetail =
    usageLine !== null || allocationLine !== null || summary.hardLimit !== null;
  const isOverage = summary.unitPrice !== null && !summary.canAddMore;
  const hasOverage =
    summary.overageUnits !== null && summary.overageUnits.quantity > 0;
  const tier =
    summary.tiers === null
      ? null
      : currentTier(summary.tiers, summary.usage.used);
  const canAddMore = summary.canAddMore && canCheckout;

  return (
    <article
      aria-label={summary.feature.name}
      className={cx(
        "schematic-card",
        "schematic-feature",
        "schematic-metered-features__card",
        `schematic-metered-features__card--${summary.usage.state}`,
      )}
      data-testid="sch-metered-feature"
    >
      <div className="schematic-feature__row">
        {showIcons && summary.icon !== null && <Icon name={summary.icon} />}
        <div className="schematic-feature__name">
          <span className="schematic-metered-features__title">
            {summary.feature.name}
          </span>
          {showDescription && summary.description !== null && (
            <span className="schematic-feature__description">
              {summary.description}
            </span>
          )}
        </div>
        {hasDetail && (
          <div
            className="schematic-feature__detail"
            data-testid="sch-feature-detail"
          >
            {usageLine !== null && (
              <span className="schematic-metered-features__usage">
                {usageLine}
              </span>
            )}
            {allocationLine !== null && (
              <span className="schematic-small schematic-muted schematic-metered-features__allocation">
                {allocationLine}
              </span>
            )}
            {summary.hardLimit !== null && (
              <span className="schematic-small schematic-muted schematic-metered-features__hard-limit">
                {hardLimitText(
                  summary.hardLimit,
                  featureName(summary.feature, summary.hardLimit),
                  locale,
                )}
              </span>
            )}
          </div>
        )}
      </div>

      {showMeter && summary.showMeter && (
        <div className="schematic-metered-features__meter">
          <Meter
            label={summary.feature.name}
            percent={summary.usage.percent ?? 0}
            state={summary.usage.state}
          />
          <span className="schematic-small schematic-muted schematic-metered-features__meter-text">
            {summary.usage.usedText}/{summary.usage.limitText}
          </span>
        </div>
      )}

      {isOverage && summary.unitPrice !== null && (
        <div
          className="schematic-row schematic-small schematic-metered-features__price"
          data-testid="sch-overage"
        >
          <span className="schematic-muted">
            Additional: {perUnitShort(summary.unitPrice)}
          </span>
          {(hasOverage || summary.cost !== null) && (
            <span>
              {[
                hasOverage && summary.overageUnits !== null
                  ? `${summary.overageUnits.quantityText} ${summary.overageUnits.unit}`
                  : null,
                summary.cost === null ? null : summary.cost.text,
              ]
                .filter((part): part is string => part !== null)
                .join(" · ")}
            </span>
          )}
        </div>
      )}

      {tier !== null && summary.tiers !== null && (
        <div
          className="schematic-small schematic-metered-features__price"
          data-testid="sch-tier"
        >
          <div className="schematic-row">
            <span className="schematic-muted">Tier: {tierRangeText(tier)}</span>
            {summary.cost !== null && <span>{summary.cost.text}</span>}
          </div>
          <span className="schematic-muted schematic-metered-features__tiers">
            {summary.tiers.rows
              .map(
                (band) =>
                  `${tierRangeText(band)}: ${band.unitPriceText}${band.flatText === null ? "" : ` + ${band.flatText}`}`,
              )
              .join(" · ")}
          </span>
        </div>
      )}

      {canAddMore && (
        <div className="schematic-feature__actions">
          <Cta
            className="schematic-cta--small"
            target={addMoreTarget}
            url={addMoreUrl}
            onClick={() => onAddMore?.(row, summary)}
          >
            Add more
          </Cta>
        </div>
      )}
    </article>
  );
}

export default MeteredFeatures;
