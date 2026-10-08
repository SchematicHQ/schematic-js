import {
  useFeatureUsage,
  useFeatureUserUsage,
  type FeatureUsage,
} from "@schematichq/schematic-react";
import { useMemo } from "react";

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
  deriveMeteredFeatures,
  featureName,
  httpStatus,
  type MeteredFeatureRow,
  type MeteredHeadline,
  type MeteredLimit,
  type MeteredMeter,
  type MeteredPriceDetails,
} from "./model";
import type { Translator } from "./strings";
import { PriceTiers, UserBreakdown, shortPeriod } from "./usage";

export interface MeteredFeaturesProps extends ElementProps {
  /** The "Usage" heading above the cards. Default false, as in the embed. */
  showHeader?: boolean;
  /**
   * Heading level. Feature names sit one level below it, or take it when the
   * heading is hidden. Default 2.
   */
  headingLevel?: HeadingLevel;
  /** Each feature's icon. Default true. */
  showIcon?: boolean;
  /** Each feature's description. Default true. */
  showDescription?: boolean;
  /** The headline: what is used, or the quantity paid for. Default true. */
  showUsage?: boolean;
  /** The limit line beneath it, and when usage resets. Default true. */
  showAllocation?: boolean;
  /** The usage meter. Default true. */
  showMeter?: boolean;
  /** The breakdown of usage by user, for event-based features. Default true. */
  showUsageByUser?: boolean;
  /** Feature ids to show, in this order; every metered feature when absent. */
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
  /**
   * Called by "Add More" on a feature paid for in advance. With neither this
   * nor `addMoreUrl`, there is no button.
   */
  onAddMore?: (feature: FeatureUsage) => void;
  /** "Add More" links here when there is no `onAddMore`. */
  addMoreUrl?: string;
  /** `target` for `addMoreUrl`. */
  addMoreTarget?: string;
}

/**
 * A card per event- or trait-based feature: usage against its limit, what it
 * costs, and who on the team used it.
 *
 * A company with no metered features renders nothing. A 404 means the
 * account is not enabled for company reads, and the element says so.
 */
export function MeteredFeatures({
  addMoreTarget,
  addMoreUrl,
  className,
  headingLevel = 2,
  locale: localeProp,
  onAddMore,
  showAllocation = true,
  showCredits = true,
  showDescription = true,
  showHardLimit = false,
  showHeader = false,
  showIcon = true,
  showMeter = true,
  showUsage = true,
  showUsageByUser = true,
  showWarningThresholdAsLimit = false,
  strings,
  visibleFeatures,
}: MeteredFeaturesProps) {
  const { data: features, error, isPending, refetch } = useFeatureUsage();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);

  const rows = useMemo(
    () =>
      features === undefined
        ? []
        : deriveMeteredFeatures(features, {
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

  const unavailable = features === undefined && httpStatus(error) === 404;
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("meteredFeaturesUnavailable")
        : t("meteredFeaturesError");

  if (features !== undefined && error === undefined && rows.length === 0) {
    return null;
  }

  const Heading = `h${headingLevel}` as const;
  const NameHeading = showHeader
    ? (`h${Math.min(6, headingLevel + 1) as HeadingLevel}` as const)
    : Heading;

  return (
    <StatusFrame
      className={cx("schematic-metered-features", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={features !== undefined}
      isPending={isPending}
      loadingLabel={t("meteredFeaturesLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={<MeteredFeaturesSkeleton showHeader={showHeader} />}
    >
      {showHeader && (
        <div className="schematic-header">
          <Heading className="schematic-header__title">
            {t("meteredFeaturesHeader")}
          </Heading>
        </div>
      )}
      <ul className="schematic-metered-features__list">
        {rows.map((row) => (
          <li
            className="schematic-card schematic-metered-features__feature"
            data-testid="schematic-metered-feature"
            key={row.featureId}
          >
            <div className="schematic-metered-features__main">
              {showIcon && (
                <span className="schematic-metered-features__icon">
                  {row.icon !== null && (
                    <i
                      aria-hidden="true"
                      className={`schematic-icon schematic-icon--${row.icon}`}
                    />
                  )}
                </span>
              )}
              <div className="schematic-metered-features__body">
                <div className="schematic-metered-features__top">
                  <div className="schematic-metered-features__title">
                    <NameHeading className="schematic-metered-features__name">
                      {row.name}
                    </NameHeading>
                    {showDescription && row.description !== null && (
                      <p className="schematic-muted">{row.description}</p>
                    )}
                  </div>
                  <div className="schematic-metered-features__figures">
                    {showUsage && row.headline !== null && (
                      <span className="schematic-metered-features__headline">
                        {headlineText(row.headline, t)}
                      </span>
                    )}
                    {showAllocation && (
                      <LimitLine
                        row={row}
                        showHardLimit={showHardLimit}
                        t={t}
                      />
                    )}
                  </div>
                </div>
                {showMeter && row.meter !== null && <Meter meter={row.meter} />}
                {row.canAddMore && (
                  <AddMore
                    label={t("meteredFeaturesAddMore")}
                    onAddMore={
                      onAddMore === undefined
                        ? undefined
                        : () => onAddMore(row.source)
                    }
                    target={addMoreTarget}
                    url={addMoreUrl}
                  />
                )}
              </div>
            </div>
            {showUsageByUser && row.hasUsageByUser && (
              <UsageByUser locale={locale} row={row} t={t} />
            )}
            {/* Last, as the card's footer bleeds to the card's edges. */}
            {row.priceDetails !== null && (
              <PriceDetails
                details={row.priceDetails}
                locale={locale}
                row={row}
                t={t}
              />
            )}
          </li>
        ))}
      </ul>
    </StatusFrame>
  );
}

function headlineText(headline: MeteredHeadline, t: Translator): string {
  if (headline.kind === "used") {
    return t("meteredFeaturesUsed", {
      amount: headline.amount,
      units: headline.units,
    });
  }
  return headline.amount === null
    ? headline.units
    : t("usageUnits", { amount: headline.amount, units: headline.units });
}

function limitText(limit: MeteredLimit, t: Translator): string {
  switch (limit.kind) {
    case "tierUpTo":
      return t("usageTierUpTo", {
        amount: limit.amount,
        feature: limit.feature,
      });
    case "tierUnlimited":
      return t("usageTierUnlimited", { feature: limit.feature });
    case "included":
      return t("meteredFeaturesIncluded", { amount: limit.amount });
    case "used":
      return t("meteredFeaturesInUse", { amount: limit.amount });
    case "cost":
      return limit.cost;
    case "perUse":
      return t("usagePerUse", { amount: limit.amount, units: limit.units });
    case "limitOf":
      return t("meteredFeaturesLimitOf", { amount: limit.amount });
    case "noLimit":
      return t("meteredFeaturesNoLimit");
  }
}

function LimitLine({
  row,
  showHardLimit,
  t,
}: {
  row: MeteredFeatureRow;
  showHardLimit: boolean;
  t: Translator;
}) {
  const parts: string[] = [];
  if (row.limit !== null) {
    parts.push(limitText(row.limit, t));
  }
  if (row.resetsAt !== null) {
    parts.push(t("usageResets", { date: row.resetsAt }));
  }
  if (parts.length === 0) {
    return null;
  }
  return (
    <span className="schematic-muted schematic-metered-features__limit">
      {parts.join(" • ")}
      {showHardLimit && row.hardLimit !== null && (
        <Tooltip label={t("usageHardLimitLabel")}>
          {t("usageHardLimit", {
            amount: row.hardLimit.amount,
            units: row.hardLimit.units,
          })}
        </Tooltip>
      )}
    </span>
  );
}

const METER_TONE_CLASS: Record<MeteredMeter["tone"], string | undefined> = {
  ok: undefined,
  warning: "schematic-meter--warning",
  critical: "schematic-meter--over",
  tier: "schematic-meter--tier",
  overage: "schematic-meter--overage",
};

function Meter({ meter }: { meter: MeteredMeter }) {
  return (
    <div className="schematic-metered-features__meter">
      <div
        aria-valuemax={meter.total}
        aria-valuemin={0}
        aria-valuenow={meter.value}
        className={cx("schematic-meter", METER_TONE_CLASS[meter.tone])}
        data-tone={meter.tone}
        role="meter"
      >
        <div
          className="schematic-meter__fill"
          style={{ width: `${meter.percent}%` }}
        />
      </div>
      {meter.total > 0 && (
        <span className="schematic-metered-features__meter-label">
          {meter.valueText}/{meter.totalText}
        </span>
      )}
    </div>
  );
}

function AddMore({
  label,
  onAddMore,
  target,
  url,
}: {
  label: string;
  onAddMore: (() => void) | undefined;
  target: string | undefined;
  url: string | undefined;
}) {
  if (onAddMore !== undefined) {
    return (
      <button
        className="schematic-cta schematic-metered-features__add-more"
        type="button"
        onClick={onAddMore}
      >
        {label}
      </button>
    );
  }
  if (url !== undefined) {
    return (
      <a
        className="schematic-cta schematic-metered-features__add-more"
        href={url}
        target={target}
      >
        {label}
      </a>
    );
  }
  return null;
}

/** The card's footer: the price past the limit, or the current tier. */
function PriceDetails({
  details,
  locale,
  row,
  t,
}: {
  details: MeteredPriceDetails;
  locale: string;
  row: MeteredFeatureRow;
  t: Translator;
}) {
  const period =
    details.period === null ? undefined : shortPeriod(details.period, t);
  if (details.kind === "overage") {
    return (
      <div className="schematic-metered-features__price-details">
        <span>
          {t("meteredFeaturesAdditional")}: {details.unitPrice}
          <sub>
            /{details.packageSize !== null && `${details.packageSize} `}
            {details.units}
            {period !== undefined && `/${period}`}
          </sub>
        </span>
        <span>
          {details.overage.amount} {details.overage.units}
          {" · "}
          {details.overage.cost}
          {period !== undefined && <sub>/{period}</sub>}
        </span>
      </div>
    );
  }
  return (
    <div className="schematic-metered-features__price-details">
      <span>
        {t("meteredFeaturesTier")}: {details.from}
        {details.to === null
          ? "+"
          : details.to !== details.from
            ? `–${details.to}`
            : ""}
        <Tooltip label={t("usageTieredPricingLabel")}>
          <PriceTiers
            currency={details.tiers.currency}
            locale={locale}
            mode={details.tiers.mode}
            period={details.period}
            ranges={details.tiers.ranges}
            t={t}
            unit={featureName(row.unit, 1, locale)}
          />
        </Tooltip>
      </span>
      {details.cost !== null && (
        <span>
          {details.cost}
          {period !== undefined && <sub>/{period}</sub>}
        </span>
      )}
    </div>
  );
}

function UsageByUser({
  locale,
  row,
  t,
}: {
  locale: string;
  row: MeteredFeatureRow;
  t: Translator;
}) {
  const { data, error, refetch } = useFeatureUserUsage(row.featureId);
  return (
    <UserBreakdown
      breakdown={
        data === undefined
          ? undefined
          : {
              count: data.count,
              total: data.total,
              unattributed: data.unattributed ?? null,
              users: data.users.map((user) => ({
                amount: user.usage,
                id: user.userId,
                label: user.name ?? user.userId,
              })),
            }
      }
      error={error}
      locale={locale}
      onRetry={refetch}
      t={t}
      unit={row.unit}
    />
  );
}

function MeteredFeaturesSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      {[0, 1].map((index) => (
        <div className="schematic-skeleton__row" key={index}>
          <div className="schematic-skeleton__cell" data-column="name" />
          <div className="schematic-skeleton__cell" data-column="usage" />
        </div>
      ))}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
MeteredFeatures.resources = ["featureUsage"] as const;

export default MeteredFeatures;
