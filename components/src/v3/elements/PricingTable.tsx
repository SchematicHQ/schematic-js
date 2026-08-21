import { useCatalog } from "@schematichq/schematic-react";
import { useMemo, useState } from "react";

import {
  PERIOD_ADVERB,
  derivePlanOfferings,
  formatPercent,
  resolveLocale,
  type PlanOffering,
  type PricePeriod,
} from "../model";

import {
  Cta,
  Icon,
  StatusFrame,
  cx,
  type CtaProps,
  type ElementProps,
} from "./common";
import {
  entitlementDetail,
  entitlementText,
  hardLimitText,
  planActionLabel,
  planCreditExtraText,
  planCreditText,
  usageViolationText,
} from "./copy";

/** What the host receives when a plan or add-on is chosen. */
export interface PlanSelection {
  period: PricePeriod | null;
  currency: string;
  /** The price point at the selection, when the plan is priced. */
  priceId: string | null;
}

export interface PricingTableProps extends ElementProps {
  /** Initial period; re-snapped to an offered one. */
  defaultPeriod?: PricePeriod;
  /** Initial currency; re-snapped to an offered one. */
  defaultCurrency?: string;
  /** Limit the currencies offered (ISO 4217). */
  currencyFilter?: string[];
  /** "Plans" / "Add-ons" headings. Default true. */
  showHeader?: boolean;
  /** Period toggle. Default true. */
  showPeriodToggle?: boolean;
  /** Currency selector, when more than one currency is offered. Default true. */
  showCurrencySelector?: boolean;
  /** Savings hint on the period toggle. Default true. */
  showSavings?: boolean;
  /** Recurring prices as monthly equivalents. Default false. */
  showAsMonthlyPrices?: boolean;
  /** Render $0 plans as "Free". Default false. */
  showZeroPriceAsFree?: boolean;
  /** Credit facts on entitlements and included credits. Default true. */
  showCredits?: boolean;
  /** Plan descriptions. Default true. */
  showDescription?: boolean;
  /** Feature descriptions under entitlement rows. Default false. */
  showFeatureDescription?: boolean;
  /** Hard-limit disclosure on priced entitlements. Default false. */
  showHardLimit?: boolean;
  /** "Everything in {previous plan}, plus". Default true. */
  showInclusionText?: boolean;
  /** Feature icons on entitlement rows. Default true. */
  showFeatureIcons?: boolean;
  /** Entitlement rows at all. Default true. */
  showEntitlements?: boolean;
  /** The add-ons section. Default true. */
  showAddOns?: boolean;
  /** Rows shown before "See all". Default 4. */
  visibleEntitlementCount?: number;
  /** CTA destination for every plan; combined with `onSelectPlan` when both are given. */
  callToActionUrl?: string;
  callToActionTarget?: string;
  /** Called when a plan's CTA is activated. */
  onSelectPlan?: (plan: PlanOffering, selection: PlanSelection) => void;
  /** Called when an add-on's CTA is activated. */
  onSelectAddOn?: (addOn: PlanOffering, selection: PlanSelection) => void;
}

/**
 * The catalog's plans and add-ons at a selected period and currency, with
 * a call to action per card. Works on the public tier (publishable key) or
 * decorated for a company (access token).
 */
export function PricingTable({
  callToActionTarget,
  callToActionUrl,
  className,
  currencyFilter,
  defaultCurrency,
  defaultPeriod,
  locale: localeProp,
  onSelectAddOn,
  onSelectPlan,
  showAddOns = true,
  showAsMonthlyPrices = false,
  showCredits = true,
  showCurrencySelector = true,
  showDescription = true,
  showEntitlements = true,
  showFeatureDescription = false,
  showFeatureIcons = true,
  showHardLimit = false,
  showHeader = true,
  showInclusionText = true,
  showPeriodToggle = true,
  showSavings = true,
  showZeroPriceAsFree = false,
  visibleEntitlementCount = 4,
}: PricingTableProps) {
  const { data: catalog, error, isPending, refetch } = useCatalog();
  const locale = resolveLocale(localeProp);
  const [period, setPeriod] = useState<PricePeriod | undefined>(defaultPeriod);
  const [currency, setCurrency] = useState<string | undefined>(defaultCurrency);

  const offerings = useMemo(
    () =>
      catalog === undefined
        ? undefined
        : derivePlanOfferings(catalog, {
            locale,
            period,
            currency,
            currencyFilter,
            showAsMonthlyPrices,
            showCredits,
            showHardLimit,
            showZeroPriceAsFree,
            usePeriodSelection: showPeriodToggle,
          }),
    [
      catalog,
      currency,
      currencyFilter,
      locale,
      period,
      showAsMonthlyPrices,
      showCredits,
      showHardLimit,
      showPeriodToggle,
      showZeroPriceAsFree,
    ],
  );

  const select = (card: PlanOffering) => {
    if (offerings === undefined) {
      return;
    }
    const selection: PlanSelection = {
      period: card.period,
      currency: offerings.currency,
      priceId: card.priceId,
    };
    (card.isAddOn ? onSelectAddOn : onSelectPlan)?.(card, selection);
  };

  const cardProps = {
    callToActionTarget,
    callToActionUrl,
    locale,
    onSelect: select,
    showCredits,
    showDescription,
    showEntitlements,
    showFeatureDescription,
    showFeatureIcons,
    showInclusionText,
    visibleEntitlementCount,
  };

  return (
    <StatusFrame
      className={cx("schematic-pricing-table", className)}
      error={error}
      hasData={offerings !== undefined}
      isPending={isPending}
      label="plans"
      onRetry={refetch}
    >
      {offerings !== undefined && (
        <>
          <div className="schematic-header">
            {showHeader && offerings.plans.length > 0 && <h2>Plans</h2>}
            <div className="schematic-pricing-table__controls">
              {showCurrencySelector && offerings.currencies.length > 1 && (
                <select
                  aria-label="Currency"
                  className="schematic-select"
                  value={offerings.currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {offerings.currencies.map((code) => (
                    <option key={code} value={code}>
                      {code.toUpperCase()}
                    </option>
                  ))}
                </select>
              )}
              {showPeriodToggle && offerings.periods.length > 1 && (
                <div
                  aria-label="Billing period"
                  className="schematic-toggle"
                  role="group"
                >
                  {offerings.periods.map((option) => {
                    const saving = offerings.savings[option];
                    const title =
                      showSavings && saving !== undefined
                        ? offerings.period === option
                          ? `You are saving ${formatPercent(saving, locale)} with ${PERIOD_ADVERB[option]} billing`
                          : `Save up to ${formatPercent(saving, locale)} with ${PERIOD_ADVERB[option]} billing`
                        : undefined;
                    return (
                      <button
                        key={option}
                        aria-pressed={offerings.period === option}
                        title={title}
                        type="button"
                        onClick={() => setPeriod(option)}
                      >
                        Billed {PERIOD_ADVERB[option]}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {offerings.plans.length > 0 && (
            <div
              className="schematic-pricing-table__plans"
              data-testid="sch-plans"
            >
              {offerings.plans.map((card) => (
                <PlanCard key={card.id} card={card} {...cardProps} />
              ))}
              {offerings.customPlan !== null && (
                <CustomPlanCard
                  cta={offerings.customPlan}
                  target={callToActionTarget}
                />
              )}
            </div>
          )}

          {showAddOns && offerings.addOns.length > 0 && (
            <section className="schematic-pricing-table__add-ons">
              {showHeader && <h2>Add-ons</h2>}
              <div
                className="schematic-pricing-table__plans"
                data-testid="sch-add-ons"
              >
                {offerings.addOns.map((card) => (
                  <PlanCard key={card.id} card={card} {...cardProps} />
                ))}
              </div>
            </section>
          )}
        </>
      )}
    </StatusFrame>
  );
}

interface PlanCardProps extends CtaProps {
  card: PlanOffering;
  callToActionUrl?: string;
  callToActionTarget?: string;
  locale: string;
  onSelect: (card: PlanOffering) => void;
  showCredits: boolean;
  showDescription: boolean;
  showEntitlements: boolean;
  showFeatureDescription: boolean;
  showFeatureIcons: boolean;
  showInclusionText: boolean;
  visibleEntitlementCount: number;
}

function PlanCard({
  callToActionTarget,
  callToActionUrl,
  card,
  locale,
  onSelect,
  showCredits,
  showDescription,
  showEntitlements,
  showFeatureDescription,
  showFeatureIcons,
  showInclusionText,
  visibleEntitlementCount,
}: PlanCardProps) {
  const [expanded, setExpanded] = useState(false);
  const { action, price } = card;
  const rows = expanded
    ? card.entitlements
    : card.entitlements.slice(0, visibleEntitlementCount);
  const canExpand = card.entitlements.length > visibleEntitlementCount;
  const violation = usageViolationText(card.usageViolations, locale);

  const url =
    action.downgradeBlocked?.url ??
    (action.kind === "custom" ? (action.url ?? undefined) : callToActionUrl);
  const label = planActionLabel(action, { isAddOn: card.isAddOn });

  return (
    <article
      aria-label={card.name}
      className={cx(
        "schematic-card",
        "schematic-plan-card",
        card.isActive && "schematic-plan-card--active",
        card.isAddOn && "schematic-plan-card--add-on",
      )}
      data-testid={card.isAddOn ? "sch-add-on" : "sch-plan"}
    >
      {card.isActive && (
        <span className="schematic-badge schematic-plan-card__badge">
          Active
        </span>
      )}
      <header className="schematic-plan-card__header">
        <h3>
          {card.icon !== null && showFeatureIcons && (
            <Icon className="schematic-icon--bare" name={card.icon} />
          )}
          {card.name}
        </h3>
        {showDescription && (
          <p className="schematic-plan-card__description">{card.description}</p>
        )}
        <div
          className="schematic-plan-card__price"
          data-testid="sch-plan-price"
        >
          {price.kind === "custom" && (
            <span>{price.text ?? "Custom price"}</span>
          )}
          {price.kind === "usage_based" && <span>Usage-based</span>}
          {price.kind === "free" && <span>Free</span>}
          {price.kind === "unavailable" && (
            <span className="schematic-muted">—</span>
          )}
          {price.kind === "priced" && (
            <>
              <span>{price.text}</span>
              {price.amount > 0 && (
                <sub>
                  /{price.periodWord}
                  {price.billedPeriodWord !== null &&
                    `, billed ${PERIOD_ADVERB[price.period]}`}
                </sub>
              )}
            </>
          )}
        </div>
      </header>

      <div className="schematic-plan-card__body">
        {showEntitlements &&
          (card.entitlements.length > 0 || card.credits.length > 0) && (
            <div>
              {showInclusionText && card.inclusionOf !== null && (
                <p className="schematic-plan-card__inclusion">
                  Everything in {card.inclusionOf}, plus
                </p>
              )}
              <ul className="schematic-plan-card__entitlements">
                {showCredits &&
                  card.credits.map((credit) => {
                    const extra = planCreditExtraText(credit);
                    return (
                      <li key={credit.credit.id}>
                        {showFeatureIcons && credit.icon !== null && (
                          <Icon name={credit.icon} />
                        )}
                        <span>
                          {planCreditText(credit)}
                          {extra !== null && (
                            <span className="schematic-plan-card__detail schematic-muted">
                              {extra}
                            </span>
                          )}
                        </span>
                      </li>
                    );
                  })}
                {rows.map((row) => {
                  const detail = entitlementDetail(row);
                  return (
                    <li key={row.feature.id}>
                      {showFeatureIcons && row.icon !== null && (
                        <Icon name={row.icon} />
                      )}
                      <span>
                        {entitlementText(row.value)}
                        {row.hardLimit !== null && (
                          <span
                            className="schematic-plan-card__detail schematic-muted"
                            title={hardLimitText(
                              row.hardLimit,
                              row.value.kind === "numeric"
                                ? row.value.unit
                                : row.feature.name,
                              locale,
                            )}
                          >
                            {hardLimitText(
                              row.hardLimit,
                              row.value.kind === "numeric"
                                ? row.value.unit
                                : row.feature.name,
                              locale,
                            )}
                          </span>
                        )}
                        {detail !== null && (
                          <span className="schematic-plan-card__detail schematic-muted">
                            {detail}
                          </span>
                        )}
                        {row.tiers !== null && (
                          <span className="schematic-plan-card__detail schematic-muted">
                            {row.tiers.rows
                              .map(
                                (tier) =>
                                  `${tier.fromText}–${tier.toText ?? "∞"}: ${tier.unitPriceText}${tier.flatText === null ? "" : ` + ${tier.flatText}`}`,
                              )
                              .join(" · ")}
                          </span>
                        )}
                        {showFeatureDescription && row.description !== null && (
                          <span className="schematic-plan-card__detail schematic-muted">
                            {row.description}
                          </span>
                        )}
                      </span>
                    </li>
                  );
                })}
              </ul>
              {canExpand && (
                <button
                  className="schematic-link-button schematic-plan-card__show-all"
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? "Hide all" : "See all"}
                </button>
              )}
            </div>
          )}

        {action.kind === "current" ? (
          <div className="schematic-plan-card__current">
            <Icon className="schematic-icon--bare" name="check-rounded" />
            <span>Current plan</span>
          </div>
        ) : (
          <div className="schematic-plan-card__action">
            <Cta
              className={cx(
                action.direction === "downgrade" && "schematic-cta--outline",
                action.kind === "remove" && "schematic-cta--outline",
              )}
              disabled={action.disabled}
              target={action.kind === "custom" ? "_blank" : callToActionTarget}
              url={url}
              onClick={() => onSelect(card)}
            >
              {label}
            </Cta>
            {violation !== null && (
              <p className="schematic-small schematic-muted">{violation}</p>
            )}
          </div>
        )}
      </div>
    </article>
  );
}

function CustomPlanCard({
  cta,
  target,
}: {
  cta: { text: string | null; url: string | null; priceText: string | null };
  target?: string;
}) {
  return (
    <article
      aria-label="Custom plan"
      className="schematic-card schematic-plan-card schematic-plan-card--custom"
      data-testid="sch-custom-plan"
    >
      <header className="schematic-plan-card__header">
        <h3>Custom</h3>
        <div className="schematic-plan-card__price">
          <span>{cta.priceText ?? "Custom price"}</span>
        </div>
      </header>
      <div className="schematic-plan-card__body">
        <div className="schematic-plan-card__action">
          <Cta target={target ?? "_blank"} url={cta.url ?? undefined}>
            {cta.text ?? "Talk to support"}
          </Cta>
        </div>
      </div>
    </article>
  );
}

export default PricingTable;
