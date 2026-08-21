import { iconsList } from "@schematichq/schematic-icons";
import {
  derivePlanOfferings,
  useCatalog,
  useSchematicLocale,
  type CatalogMode,
  type DisplayToggles,
  type EntitlementSummary,
  type PlanOffering,
  type PricePeriod,
} from "@schematichq/schematic-react";
import React, { useMemo, useState } from "react";

import { StatusFrame, cx } from "./common";

export interface PricingTableProps extends DisplayToggles {
  className?: string;
  /** Href for each plan's call to action; rendered as a link. */
  callToActionUrl?: string;
  /** Anchor target for callToActionUrl. Default "_self". */
  callToActionTarget?: React.HTMLAttributeAnchorTarget;
  /** A specific catalog; omitted, the environment's default catalog. */
  catalogId?: string;
  /** BCP 47 locale for formatting; the provider's locale, then the browser's, if omitted. */
  locale?: string;
  /**
   * "public" forces the anonymous catalog even with an access token (a
   * logged-in user on the public pricing page); omitted, the token decides.
   */
  mode?: CatalogMode;
  /**
   * Called when a plan's call-to-action is clicked, with the selected
   * period and currency — the handoff to your checkout.
   */
  onSelectPlan?: (
    plan: PlanOffering,
    selection: { currency?: string; period: PricePeriod },
  ) => void;
  /** Entitlement rows shown per card before truncation. Default 4. */
  visibleEntitlements?: number;
}

const PERIOD_LABELS: Record<string, string> = {
  month: "Billed monthly",
  one_time: "One-time",
  quarter: "Billed quarterly",
  year: "Billed yearly",
};

const PERIOD_WORDS: Record<string, string> = {
  month: "month",
  one_time: "one-time",
  quarter: "quarter",
  year: "year",
};

const SHORT_PERIODS: Record<string, string> = {
  month: "mo",
  quarter: "qtr",
  year: "yr",
};

const METRIC_PERIOD_NAMES: Record<string, string> = {
  billing: "billing period",
  current_day: "day",
  current_month: "month",
  current_week: "week",
  current_year: "year",
};

/**
 * A feature/plan icon as the v2 embed renders it: a glyph from the
 * schematic-icons font in a rounded neutral chip. Names outside the icon
 * set (e.g. emoji) render as text, matching the v2 fallback.
 */
export const FeatureIcon: React.FC<{ name: string }> = ({ name }) =>
  name in iconsList ? (
    <i aria-hidden className={`schematic-icon icon-${name}`} title={name} />
  ) : (
    <span aria-hidden className="schematic-icon">
      {name}
    </span>
  );

const nameForCount = (
  parts: { name: string; pluralName?: string; singularName?: string },
  count: number,
): string => {
  if (count === 1) {
    return parts.singularName || parts.name;
  }
  return parts.pluralName || parts.name;
};

/** Renders one entitlement row from its discriminated summary. */
export const EntitlementRow: React.FC<{
  period: PricePeriod;
  row: EntitlementSummary;
  showFeatureDescription?: boolean;
}> = ({ period, row, showFeatureDescription }) => {
  let detail: string;
  let subDetail: string | undefined;
  switch (row.kind) {
    case "priced": {
      const price = row.price;
      if (price !== undefined) {
        const packageSize = price.packageSize ?? 1;
        const per =
          packageSize > 1
            ? `${packageSize} ${nameForCount(row.feature, packageSize)}`
            : nameForCount(row.feature, 1);
        detail = `${price.formatted} per ${per}`;
        if (row.priceBehavior === "pay_in_advance") {
          detail += ` per ${PERIOD_WORDS[price.period] ?? price.period}`;
        }
      } else {
        detail = row.featureLabel;
      }
      break;
    }
    case "tiered":
      detail = row.featureLabel;
      subDetail = "Tier-based";
      break;
    case "credit_rate":
      detail = `${row.credit?.formattedConsumptionRate ?? ""} ${
        row.credit !== undefined
          ? nameForCount(row.credit, row.credit.consumptionRate ?? 0)
          : "credits"
      } per ${row.featureLabel}`;
      break;
    case "credit_limit":
      detail = `Up to ${row.formattedLimit} ${row.featureLabel}`;
      break;
    case "numeric":
      detail = `${row.formattedLimit} ${row.featureLabel}`;
      if (row.metricPeriod !== undefined && row.feature.type === "event") {
        detail += ` per ${METRIC_PERIOD_NAMES[row.metricPeriod] ?? row.metricPeriod}`;
      }
      break;
    case "unlimited":
      detail = `Unlimited ${row.featureLabel}`;
      break;
    default:
      detail = row.featureLabel;
  }
  if (row.overage?.formattedUnitPrice !== undefined) {
    subDetail = `then ${row.overage.formattedUnitPrice}/${nameForCount(row.feature, 1)}${
      row.feature.type === "trait" ? `/${SHORT_PERIODS[period] ?? period}` : ""
    }`;
  }
  if (row.overage?.formattedHardLimit !== undefined) {
    subDetail = `${subDetail !== undefined ? `${subDetail}, ` : ""}up to ${row.overage.formattedHardLimit}`;
  }
  return (
    <li>
      {row.feature.icon !== "" && <FeatureIcon name={row.feature.icon} />}
      <div>
        <div>{detail}</div>
        {subDetail !== undefined && (
          <span className="schematic-plan-card__detail schematic-muted">
            {subDetail}
          </span>
        )}
        {showFeatureDescription === true && row.feature.description !== "" && (
          <span className="schematic-plan-card__detail schematic-muted">
            {row.feature.description}
          </span>
        )}
      </div>
    </li>
  );
};

export const PlanCard: React.FC<{
  callToActionTarget?: React.HTMLAttributeAnchorTarget;
  callToActionUrl?: string;
  currency?: string;
  onSelectPlan?: (plan: PlanOffering) => void;
  period: PricePeriod;
  plan: PlanOffering;
  showFeatureDescription?: boolean;
  visibleEntitlements: number;
}> = ({
  callToActionTarget,
  callToActionUrl,
  onSelectPlan,
  period,
  plan,
  showFeatureDescription,
  visibleEntitlements,
}) => {
  const [expanded, setExpanded] = useState(false);
  const rows = expanded
    ? plan.entitlements
    : plan.entitlements.slice(0, visibleEntitlements);

  let priceLine: React.ReactNode;
  switch (plan.price.kind) {
    case "priced": {
      const price = plan.price.price;
      const shown = price.monthlyEquivalent ?? price;
      const suffix =
        price.monthlyEquivalent !== undefined
          ? `month, billed ${PERIOD_WORDS[price.period] ?? price.period}ly`
          : (PERIOD_WORDS[price.period] ?? price.period);
      priceLine = (
        <div className="schematic-plan-card__price">
          {shown.formatted}
          <sub>/{suffix}</sub>
        </div>
      );
      break;
    }
    case "free":
      priceLine = <div className="schematic-plan-card__price">Free</div>;
      break;
    case "usage_based":
      priceLine = <div className="schematic-plan-card__price">Usage-based</div>;
      break;
    default:
      priceLine = (
        <div className="schematic-plan-card__price schematic-muted">—</div>
      );
  }

  const showCallToAction =
    callToActionUrl !== undefined || onSelectPlan !== undefined;
  // A plan the company can't move to renders a disabled control in both
  // the link and button forms — never a live link labeled with the reason.
  const blocked = !plan.valid || plan.compatibleWithCurrentPlan === false;
  const callToActionCopy = !plan.valid
    ? "Over plan limit"
    : plan.compatibleWithCurrentPlan === false
      ? "Not available on your plan"
      : plan.canTrial
        ? plan.trialDays !== undefined
          ? `Start ${plan.trialDays}-day trial`
          : "Start trial"
        : "Choose plan";

  return (
    <div className="schematic-card schematic-plan-card">
      {plan.current && (
        <span className="schematic-plan-card__badge">Active</span>
      )}
      <div className="schematic-plan-card__header">
        <h3>{plan.name}</h3>
        {/* Rendered even when empty so every card shares the v2 rhythm. */}
        <p>{plan.description}</p>
        {priceLine}
      </div>
      <div className="schematic-plan-card__body">
        <ul className="schematic-plan-card__entitlements">
          {rows.map((row) => (
            <EntitlementRow
              key={row.feature.id}
              period={period}
              row={row}
              showFeatureDescription={showFeatureDescription}
            />
          ))}
          {plan.entitlements.length > visibleEntitlements && (
            <li className="schematic-plan-card__show-all">
              <i
                aria-hidden
                className={`schematic-icon icon-chevron-${expanded ? "up" : "down"}`}
              />
              <button
                className="schematic-link-button"
                type="button"
                onClick={() => setExpanded((v) => !v)}
              >
                {expanded ? "Hide all" : "See all"}
              </button>
            </li>
          )}
        </ul>
        {plan.current ? (
          <div className="schematic-plan-card__current">
            <i aria-hidden className="schematic-icon icon-check-rounded" />
            <span>Current plan</span>
          </div>
        ) : (
          showCallToAction &&
          (callToActionUrl !== undefined && !blocked ? (
            <a
              className="schematic-cta"
              href={callToActionUrl}
              target={callToActionTarget ?? "_self"}
              onClick={() => onSelectPlan?.(plan)}
            >
              {callToActionCopy}
            </a>
          ) : (
            <button
              className="schematic-cta"
              disabled={blocked}
              type="button"
              onClick={() => onSelectPlan?.(plan)}
            >
              {callToActionCopy}
            </button>
          ))
        )}
      </div>
    </div>
  );
};

/**
 * A pricing table over the catalog: period/currency selection, plan cards
 * with entitlement rows, add-ons, and the custom-plan call to action.
 * Works with a publishable key alone; with an access token the cards carry
 * company decoration (current plan, validity).
 */
export const PricingTable: React.FC<PricingTableProps> = ({
  className,
  callToActionTarget,
  callToActionUrl,
  catalogId,
  locale: localeProp,
  mode,
  onSelectPlan,
  showAsMonthlyPrices,
  showCredits,
  showFeatureDescription,
  showHardLimit,
  showPeriodToggle,
  showZeroPriceAsFree,
  visibleEntitlements = 4,
}) => {
  const { data, error, isPending, refetch } = useCatalog({
    ...(catalogId !== undefined ? { catalogId } : {}),
    ...(mode !== undefined ? { mode } : {}),
  });
  const providerLocale = useSchematicLocale();
  const locale = localeProp ?? providerLocale;
  const [period, setPeriod] = useState<PricePeriod | undefined>(undefined);
  const [currency, setCurrency] = useState<string | undefined>(undefined);

  const vm = useMemo(
    () =>
      data !== undefined
        ? derivePlanOfferings(data, {
            currency,
            locale,
            period,
            showAsMonthlyPrices,
            showCredits,
            showFeatureDescription,
            showHardLimit,
            showPeriodToggle,
            showZeroPriceAsFree,
          })
        : undefined,
    [
      currency,
      data,
      locale,
      period,
      showAsMonthlyPrices,
      showCredits,
      showFeatureDescription,
      showHardLimit,
      showPeriodToggle,
      showZeroPriceAsFree,
    ],
  );
  // The handoff carries the period the CARD is priced at: the selected
  // recurring period for plans, one_time for one-time offerings.
  const selectPlan = useMemo(
    () =>
      onSelectPlan !== undefined && vm !== undefined
        ? (plan: PlanOffering) =>
            onSelectPlan(plan, {
              ...(vm.selectedCurrency !== undefined
                ? { currency: vm.selectedCurrency }
                : {}),
              period: plan.period,
            })
        : undefined,
    [onSelectPlan, vm],
  );

  const controls = vm !== undefined && (
    <div className="schematic-pricing-table__controls">
      {vm.currencies.length > 1 && (
        <select
          aria-label="Currency"
          value={vm.selectedCurrency}
          onChange={(event) => setCurrency(event.target.value)}
        >
          {vm.currencies.map((option) => (
            <option key={option} value={option}>
              {option.toUpperCase()}
            </option>
          ))}
        </select>
      )}
      {vm.showPeriodToggle && (
        <div className="schematic-pricing-table__toggle">
          {vm.togglePeriods.map((option) => (
            <button
              aria-pressed={option === vm.selectedPeriod}
              key={option}
              type="button"
              onClick={() => setPeriod(option)}
            >
              {PERIOD_LABELS[option] ?? option}
            </button>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <StatusFrame
      className={cx("schematic-pricing-table", className)}
      error={error}
      hasData={vm !== undefined}
      isPending={isPending}
      onRetry={() => void refetch()}
    >
      {vm !== undefined && (
        <>
          <div>
            <div className="schematic-pricing-table__header">
              {vm.plans.length > 0 && <h3>Plans</h3>}
              {controls}
            </div>
            <div className="schematic-pricing-table__plans">
              {vm.plans.map((plan) => (
                <PlanCard
                  callToActionTarget={callToActionTarget}
                  callToActionUrl={callToActionUrl}
                  key={plan.id}
                  onSelectPlan={selectPlan}
                  period={plan.period}
                  plan={plan}
                  showFeatureDescription={showFeatureDescription}
                  visibleEntitlements={visibleEntitlements}
                />
              ))}
              {vm.customPlanCta !== undefined && (
                <div className="schematic-card schematic-plan-card">
                  <div className="schematic-plan-card__header">
                    <h3>Custom plan</h3>
                    <div className="schematic-plan-card__price">
                      {vm.customPlanCta.priceText ?? "Let's talk"}
                    </div>
                  </div>
                  <div className="schematic-plan-card__body">
                    {vm.customPlanCta.ctaUrl !== undefined && (
                      <a
                        className="schematic-cta"
                        href={vm.customPlanCta.ctaUrl}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {vm.customPlanCta.ctaText ?? "Talk to support"}
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
          {vm.addOns.length > 0 && (
            <div>
              <div className="schematic-pricing-table__header">
                <h3>Add-ons</h3>
              </div>
              <div className="schematic-pricing-table__plans">
                {vm.addOns.map((addOn) => (
                  <PlanCard
                    callToActionTarget={callToActionTarget}
                    callToActionUrl={callToActionUrl}
                    key={addOn.id}
                    onSelectPlan={selectPlan}
                    period={addOn.period}
                    plan={addOn}
                    showFeatureDescription={showFeatureDescription}
                    visibleEntitlements={visibleEntitlements}
                  />
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </StatusFrame>
  );
};
