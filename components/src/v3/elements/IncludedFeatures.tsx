import { useMemo, useState } from "react";

import type { AnyCatalog, CatalogPlan, FeatureUsageRow } from "../contract";
import { useCatalog, useCompany, useFeatureUsage } from "../data";
import {
  derivePeriod,
  derivePlanCredits,
  deriveUsage,
  featureName,
  resolveLocale,
  type PlanCreditSummary,
  type UsageSummary,
} from "../model";

import {
  Icon,
  StatusFrame,
  cx,
  pickVisible,
  type ElementProps,
} from "./common";
import {
  allocationText,
  hardLimitText,
  planCreditText,
  usageText,
} from "./copy";

export interface IncludedFeaturesProps extends ElementProps {
  /** Feature IDs to show, in this order. Default: every row, in server order. */
  visibleFeatures?: string[];
  /** The heading. Default true. */
  showHeader?: boolean;
  /** Heading text. Default "Included features". */
  headerText?: string;
  /** Feature icons. Default true. */
  showIcons?: boolean;
  /** Feature descriptions under the name. Default true. */
  showDescription?: boolean;
  /** The usage line under the allocation. Default true. */
  showUsage?: boolean;
  /** "Expires …" on entitlements that expire. Default true. */
  showExpiration?: boolean;
  /** Credit facts: consumption rates and per-license credit lines. Default true. */
  showCredits?: boolean;
  /** Hard-limit disclosure on priced entitlements. Default false. */
  showHardLimit?: boolean;
  /** Show the warning threshold as the limit. Default false. */
  showWarningThresholdAsLimit?: boolean;
  /** Percent of the limit at which usage reads as a warning; defaults to the server threshold, else 90. */
  warningPercent?: number;
  /** Rows shown before "See all". Default 4. */
  visibleCount?: number;
}

interface IncludedRow {
  row: FeatureUsageRow;
  summary: UsageSummary;
  /** Per-license credit grants that scale with this feature. */
  credits: PlanCreditSummary[];
}

/** The usage line, leading with the count for limited and unlimited rows. */
/** The plan the company holds, as the catalog describes it. */
function currentPlan(
  catalog: AnyCatalog | undefined,
  planId: string | undefined,
): CatalogPlan | undefined {
  if (catalog === undefined) {
    return undefined;
  }
  return catalog.plans.find((plan) =>
    planId === undefined
      ? "current" in plan && plan.current
      : plan.id === planId,
  );
}

/**
 * The company's entitlements as rows: every feature it holds, with its
 * allocation and usage beside metered ones. Needs an access token.
 */
export function IncludedFeatures({
  className,
  headerText = "Included features",
  locale: localeProp,
  showCredits = true,
  showDescription = true,
  showExpiration = true,
  showHardLimit = false,
  showHeader = true,
  showIcons = true,
  showUsage = true,
  showWarningThresholdAsLimit = false,
  visibleCount = 4,
  visibleFeatures,
  warningPercent,
}: IncludedFeaturesProps) {
  const usage = useFeatureUsage();
  const company = useCompany();
  const { data: catalog } = useCatalog();
  const locale = resolveLocale(localeProp);
  const [expanded, setExpanded] = useState(false);

  const subscription = company.data?.subscription ?? null;
  const period =
    subscription === null
      ? null
      : derivePeriod(subscription.interval, subscription.intervalCount);
  const currency = subscription === null ? null : subscription.currency;
  const plan = currentPlan(catalog, company.data?.plan?.id);

  const rows = useMemo<IncludedRow[] | undefined>(() => {
    if (usage.data === undefined) {
      return undefined;
    }
    return pickVisible(
      usage.data,
      visibleFeatures,
      (row) => row.feature.id,
    ).map((row) => ({
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
      credits:
        plan === undefined
          ? []
          : derivePlanCredits(
              plan.includedCreditGrants.filter(
                (grant) =>
                  grant.scaling === "per_license" &&
                  grant.licenseId === row.feature.id,
              ),
              plan,
              locale,
            ),
    }));
  }, [
    currency,
    locale,
    period,
    plan,
    showCredits,
    showHardLimit,
    showWarningThresholdAsLimit,
    usage.data,
    visibleFeatures,
    warningPercent,
  ]);

  // The company supplies the period and currency prices are read at; wait
  // for it rather than render rows without prices and then re-render.
  const companyLoading =
    company.data === undefined &&
    company.error === undefined &&
    company.isPending;
  const visible =
    rows === undefined || expanded ? rows : rows.slice(0, visibleCount);
  const canExpand = rows !== undefined && rows.length > visibleCount;

  return (
    <StatusFrame
      className={cx("schematic-included-features", className)}
      error={usage.error}
      hasData={rows !== undefined && !companyLoading}
      isPending={usage.isPending || companyLoading}
      label="included features"
      onRetry={usage.refetch}
    >
      {visible !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <h2>{headerText}</h2>
            </div>
          )}

          {visible.length === 0 ? (
            <p
              className="schematic-muted schematic-included-features__empty"
              data-testid="sch-empty"
            >
              No features included
            </p>
          ) : (
            <ul className="schematic-feature-list">
              {visible.map(({ row, summary, credits }) => (
                <FeatureRow
                  key={
                    row.planEntitlementId ??
                    row.companyOverrideId ??
                    row.feature.id
                  }
                  credits={credits}
                  locale={locale}
                  showCredits={showCredits}
                  showDescription={showDescription}
                  showExpiration={showExpiration}
                  showIcons={showIcons}
                  showUsage={showUsage}
                  summary={summary}
                />
              ))}
            </ul>
          )}

          {canExpand && (
            <button
              className="schematic-link-button schematic-included-features__show-all"
              type="button"
              onClick={() => setExpanded((value) => !value)}
            >
              {expanded ? "Hide all" : "See all"}
            </button>
          )}
        </>
      )}
    </StatusFrame>
  );
}

interface FeatureRowProps {
  credits: PlanCreditSummary[];
  locale: string;
  showCredits: boolean;
  showDescription: boolean;
  showExpiration: boolean;
  showIcons: boolean;
  showUsage: boolean;
  summary: UsageSummary;
}

function FeatureRow({
  credits,
  locale,
  showCredits,
  showDescription,
  showExpiration,
  showIcons,
  showUsage,
  summary,
}: FeatureRowProps) {
  const allocation = allocationText(summary.allocation);
  const usageLine = showUsage ? usageText(summary) : null;
  const hasDetail =
    allocation !== null || usageLine !== null || summary.hardLimit !== null;

  return (
    <li
      aria-label={summary.feature.name}
      className={cx(
        "schematic-feature",
        "schematic-included-features__feature",
        !summary.access && "schematic-included-features__feature--no-access",
      )}
      data-testid="sch-feature"
    >
      <div className="schematic-feature__row">
        {showIcons && summary.icon !== null && <Icon name={summary.icon} />}
        <div className="schematic-feature__name">
          <span className="schematic-included-features__title">
            {summary.feature.name}
          </span>
          {showDescription && summary.description !== null && (
            <span className="schematic-feature__description">
              {summary.description}
            </span>
          )}
          {showCredits &&
            credits.map((credit) => (
              <span
                key={credit.credit.id}
                className="schematic-feature__description schematic-included-features__credits"
              >
                {planCreditText(credit)}
              </span>
            ))}
          {showExpiration && summary.expiresAt !== null && (
            <span className="schematic-feature__description schematic-included-features__expiration">
              <em>Expires {summary.expiresAt.text}</em>
            </span>
          )}
        </div>
        {hasDetail && (
          <div
            className="schematic-feature__detail"
            data-testid="sch-feature-detail"
          >
            {allocation !== null && (
              <span className="schematic-included-features__allocation">
                {allocation}
              </span>
            )}
            {summary.hardLimit !== null && (
              <span className="schematic-small schematic-muted schematic-included-features__hard-limit">
                {hardLimitText(
                  summary.hardLimit,
                  featureName(summary.feature, summary.hardLimit),
                  locale,
                )}
              </span>
            )}
            {usageLine !== null && (
              <span className="schematic-small schematic-muted schematic-included-features__usage">
                {usageLine}
              </span>
            )}
          </div>
        )}
      </div>
    </li>
  );
}

export default IncludedFeatures;
