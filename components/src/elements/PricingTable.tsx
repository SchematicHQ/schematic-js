import { useCatalog, useCompany } from "@schematichq/schematic-react";
import { useId, useMemo, useState } from "react";

import {
  Icon,
  StatusFrame,
  Tooltip,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import {
  checkoutSelectionFor,
  derivePricingTable,
  httpStatus,
  selectionAction,
  type CheckoutSelection,
  type PricingAction,
  type PricingCard,
  type PricingCreditLine,
  type PricingCustomPlan,
  type PricingEntitlementRow,
  type PricingPeriod,
  type PricingPrice,
  type PricingSelectionAction,
  type PricingTableView,
} from "./model";
import type { StringKey, Translator } from "./strings";
import { PriceTiers, shortPeriod } from "./usage";

const VISIBLE_ENTITLEMENT_COUNT = 4;

/** What a card's action hands the host, to open a checkout or a sign-up. */
export interface PricingTableSelection {
  kind: "plan" | "addOn";
  /** `remove` and `change` are for an add-on the company holds. */
  action: PricingSelectionAction;
  /** The plan's or add-on's id. */
  id: string;
  /** The price the card shows, for a checkout's selections. */
  priceId: string | null;
  /** `null` for a one-time add-on. */
  period: PricingPeriod | null;
  currency: string;
  /** A trial the plan offers, in days. */
  trialDays: number | null;
  /** The cart to open `<Checkout selection={...} />` on for this action. */
  checkout: CheckoutSelection;
}

export interface PricingTableProps extends ElementProps {
  /** The catalog to show; the environment's when absent. */
  catalogId?: string;
  /** Heading level of "Plans" and "Add-ons"; the cards sit one below. Default 2. */
  headingLevel?: HeadingLevel;
  /** "Plans" and "Add-ons" above their cards. Default true. */
  showHeader?: boolean;
  /** The plans, and the custom plan where the catalog offers one. Default true. */
  showPlans?: boolean;
  /** The add-ons. Default true. */
  showAddOns?: boolean;
  /** The monthly / yearly toggle, when the catalog prices in more than one. Default true. */
  showPeriodToggle?: boolean;
  /** The currency picker, when the catalog prices in more than one. Default true. */
  showCurrencySelector?: boolean;
  /** Each card's description. Default true. */
  showDescription?: boolean;
  /** Each card's features. Default true. */
  showEntitlements?: boolean;
  /** Each feature's icon. Default true. */
  showFeatureIcons?: boolean;
  /** Each feature's description. Default false. */
  showFeatureDescriptions?: boolean;
  /** "Everything in {plan}, plus" above each plan's features but the first. Default true. */
  showInclusionText?: boolean;
  /** Each plan's included credits, and "credits per use" on its features. Default true. */
  showCredits?: boolean;
  /** A plan priced at zero reads "Free". Default false. */
  showZeroPriceAsFree?: boolean;
  /** An info tip with the hard limit on features billed past it. Default false. */
  showHardLimit?: boolean;
  /**
   * Show an entitlement's warning threshold in place of its limit, where one
   * is configured. Default false.
   */
  showWarningThresholdAsLimit?: boolean;
  /** The period shown. Set it to control the toggle; leave it to let the table. */
  period?: PricingPeriod;
  /** The period first shown when `period` is not set. */
  defaultPeriod?: PricingPeriod;
  onPeriodChange?: (period: PricingPeriod) => void;
  /** The currency shown, lowercase. Set it to control the picker. */
  currency?: string;
  /** The currency first shown when `currency` is not set. */
  defaultCurrency?: string;
  onCurrencyChange?: (currency: string) => void;
  /**
   * A card's action calls this: open a checkout with the selection, or send
   * a visitor nobody has signed in as to sign up. Without it or
   * `callToActionUrl`, cards have no action.
   */
  onSelectPlan?: (selection: PricingTableSelection) => void;
  /** A card's action links here when there is no `onSelectPlan`. */
  callToActionUrl?: string;
  /** `target` for `callToActionUrl`. */
  callToActionTarget?: string;
}

/** A card's name sits a level below its section's heading. */
const CARD_HEADING = {
  1: "h2",
  2: "h3",
  3: "h4",
  4: "h5",
  5: "h6",
  6: "h6",
} as const;

const BILLED_KEY: Record<PricingPeriod, StringKey> = {
  month: "pricingTableBilledMonthly",
  quarter: "pricingTableBilledQuarterly",
  year: "pricingTableBilledYearly",
};

const PERIOD_KEY: Record<string, StringKey> = {
  day: "periodDay",
  month: "periodMonth",
  quarter: "periodQuarter",
  week: "periodWeek",
  year: "periodYear",
};

/**
 * The catalog's plans and add-ons, priced in the period and currency the
 * reader picks.
 *
 * It reads the catalog through `useCatalog`: the public catalog until
 * someone signs in, then the company's view, which adds the current plan,
 * the plans the company cannot move to and why, and whether it can check
 * out. With a session it also reads the company, for the period its
 * subscription bills in; a company that fails to load costs only that.
 * The table opens nothing itself: each card's action calls `onSelectPlan`.
 */
export function PricingTable({
  callToActionTarget,
  callToActionUrl,
  catalogId,
  className,
  currency: currencyProp,
  defaultCurrency,
  defaultPeriod,
  headingLevel = 2,
  locale: localeProp,
  onCurrencyChange,
  onPeriodChange,
  onSelectPlan,
  period: periodProp,
  showAddOns = true,
  showCredits = true,
  showCurrencySelector = true,
  showDescription = true,
  showEntitlements = true,
  showFeatureDescriptions = false,
  showFeatureIcons = true,
  showHardLimit = false,
  showHeader = true,
  showInclusionText = true,
  showPeriodToggle = true,
  showPlans = true,
  showWarningThresholdAsLimit = false,
  showZeroPriceAsFree = false,
  strings,
}: PricingTableProps) {
  const catalog = useCatalog(catalogId === undefined ? {} : { catalogId });
  const company = useCompany();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);

  const [chosenPeriod, setChosenPeriod] = useState(defaultPeriod);
  const [chosenCurrency, setChosenCurrency] = useState(defaultCurrency);
  const askedPeriod = periodProp ?? chosenPeriod;
  const askedCurrency = currencyProp ?? chosenCurrency;

  const companyMode = catalog.data?.source === "company";
  // Only the company's view stands a company against the catalog, and its
  // period decides which one the current plan is current in.
  const companySettled =
    !companyMode || company.data !== undefined || company.error !== undefined;

  const view = useMemo(
    () =>
      catalog.data === undefined || !companySettled
        ? undefined
        : derivePricingTable(catalog.data, {
            locale,
            period: askedPeriod,
            currency: askedCurrency,
            company: companyMode ? company.data : undefined,
            showCredits,
            showWarningThresholdAsLimit,
            showZeroPriceAsFree,
          }),
    [
      askedCurrency,
      askedPeriod,
      catalog.data,
      company.data,
      companyMode,
      companySettled,
      locale,
      showCredits,
      showWarningThresholdAsLimit,
      showZeroPriceAsFree,
    ],
  );

  const error = catalog.error;
  const unavailable = view === undefined && httpStatus(error) === 404;
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("pricingTableUnavailable")
        : t("pricingTableError");

  const choosePeriod = (next: PricingPeriod) => {
    if (periodProp === undefined) {
      setChosenPeriod(next);
    }
    onPeriodChange?.(next);
  };
  const chooseCurrency = (next: string) => {
    if (currencyProp === undefined) {
      setChosenCurrency(next);
    }
    onCurrencyChange?.(next);
  };

  const shared: CardShared | undefined =
    view === undefined
      ? undefined
      : {
          callToActionTarget,
          callToActionUrl,
          headingLevel,
          locale,
          onSelectPlan,
          showCredits,
          showDescription,
          showEntitlements,
          showFeatureDescriptions,
          showFeatureIcons,
          showHardLimit,
          t,
          view,
        };
  const plansShown =
    showPlans &&
    view !== undefined &&
    (view.plans.length > 0 || view.customPlan !== null);
  const addOnsShown =
    showAddOns && view !== undefined && view.addOns.length > 0;

  return (
    <StatusFrame
      className={cx("schematic-pricing-table", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={view !== undefined}
      isPending={catalog.isPending || (companyMode && !companySettled)}
      loadingLabel={t("pricingTableLoading")}
      onRetry={catalog.refetch}
      retryText={t("retry")}
      skeleton={<PricingTableSkeleton />}
    >
      {view !== undefined && shared !== undefined && (
        <>
          <section className="schematic-pricing-table__section">
            {(plansShown || addOnsShown) && (
              <Controls
                currencies={showCurrencySelector ? view.currencies : []}
                currency={view.currency}
                heading={
                  showHeader
                    ? plansShown
                      ? t("pricingTablePlans")
                      : t("pricingTableAddOns")
                    : null
                }
                headingLevel={headingLevel}
                onCurrency={chooseCurrency}
                onPeriod={choosePeriod}
                period={view.period}
                periods={showPeriodToggle ? view.periods : []}
                savings={view.savings}
                t={t}
              />
            )}
            {plansShown && (
              <ul
                aria-label={t("pricingTablePlans")}
                className="schematic-pricing-table__plans"
              >
                {view.plans.map((plan, index) => (
                  <Card
                    card={plan}
                    inclusion={
                      showInclusionText && index > 0
                        ? view.plans[index - 1].name
                        : null
                    }
                    key={plan.id}
                    kind="plan"
                    shared={shared}
                  />
                ))}
                {view.customPlan !== null && (
                  <CustomPlanCard
                    customPlan={view.customPlan}
                    shared={shared}
                  />
                )}
              </ul>
            )}
            {addOnsShown && !plansShown && <AddOnList shared={shared} />}
          </section>
          {addOnsShown && plansShown && (
            <section className="schematic-pricing-table__section">
              {showHeader && (
                <SectionHeading
                  className="schematic-pricing-table__heading"
                  level={headingLevel}
                >
                  {t("pricingTableAddOns")}
                </SectionHeading>
              )}
              <AddOnList shared={shared} />
            </section>
          )}
        </>
      )}
    </StatusFrame>
  );
}

function AddOnList({ shared }: { shared: CardShared }) {
  return (
    <ul
      aria-label={shared.t("pricingTableAddOns")}
      className="schematic-pricing-table__plans"
    >
      {shared.view.addOns.map((addOn) => (
        <Card
          card={addOn}
          inclusion={null}
          key={addOn.id}
          kind="addOn"
          shared={shared}
        />
      ))}
    </ul>
  );
}

interface CardShared {
  callToActionTarget: string | undefined;
  callToActionUrl: string | undefined;
  headingLevel: HeadingLevel;
  locale: string;
  onSelectPlan: ((selection: PricingTableSelection) => void) | undefined;
  showCredits: boolean;
  showDescription: boolean;
  showEntitlements: boolean;
  showFeatureDescriptions: boolean;
  showFeatureIcons: boolean;
  showHardLimit: boolean;
  t: Translator;
  view: PricingTableView;
}

function SectionHeading({
  children,
  className,
  level,
}: {
  children: React.ReactNode;
  className: string;
  level: HeadingLevel;
}) {
  const Heading = `h${level}` as const;
  return <Heading className={className}>{children}</Heading>;
}

/** The first section's heading, with the period toggle and currency picker. */
function Controls({
  currencies,
  currency,
  heading,
  headingLevel,
  onCurrency,
  onPeriod,
  period,
  periods,
  savings,
  t,
}: {
  currencies: string[];
  currency: string;
  heading: string | null;
  headingLevel: HeadingLevel;
  onCurrency: (currency: string) => void;
  onPeriod: (period: PricingPeriod) => void;
  period: PricingPeriod | null;
  periods: PricingPeriod[];
  savings: PricingTableView["savings"];
  t: Translator;
}) {
  const showCurrencies = currencies.length > 1;
  const showPeriods = periods.length > 1 && period !== null;
  if (heading === null && !showCurrencies && !showPeriods) {
    return null;
  }
  return (
    <div className="schematic-pricing-table__header">
      {heading !== null && (
        <SectionHeading
          className="schematic-pricing-table__heading"
          level={headingLevel}
        >
          {heading}
        </SectionHeading>
      )}
      {(showCurrencies || showPeriods) && (
        <div className="schematic-pricing-table__controls">
          {showCurrencies && (
            <select
              aria-label={t("pricingTableCurrency")}
              className="schematic-select"
              value={currency}
              onChange={(event) => onCurrency(event.target.value)}
            >
              {currencies.map((code) => (
                <option
                  className="schematic-select__option"
                  key={code}
                  value={code}
                >
                  {code.toUpperCase()}
                </option>
              ))}
            </select>
          )}
          {showPeriods && (
            <div
              aria-label={t("pricingTablePeriod")}
              className="schematic-toggle"
              role="group"
            >
              {periods.map((option) => {
                const button = (
                  <button
                    aria-pressed={option === period}
                    className="schematic-toggle__option"
                    key={option}
                    type="button"
                    onClick={() => {
                      if (option !== period) {
                        onPeriod(option);
                      }
                    }}
                  >
                    {t(BILLED_KEY[option])}
                  </button>
                );
                const saved = savings[option];
                if (saved === undefined || option === "month") {
                  return button;
                }
                return (
                  <span className="schematic-toggle__tip" key={option}>
                    {button}
                    <span
                      className="schematic-tooltip__content schematic-toggle__tip-content"
                      role="tooltip"
                    >
                      {t(
                        option === period
                          ? option === "year"
                            ? "pricingTableSavingYearly"
                            : "pricingTableSavingQuarterly"
                          : option === "year"
                            ? "pricingTableSaveYearly"
                            : "pricingTableSaveQuarterly",
                        { percent: saved },
                      )}
                    </span>
                  </span>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Card({
  card,
  inclusion,
  kind,
  shared,
}: {
  card: PricingCard;
  inclusion: string | null;
  kind: "plan" | "addOn";
  shared: CardShared;
}) {
  const { headingLevel, t, view } = shared;
  const [expanded, setExpanded] = useState(false);
  const listId = useId();
  const Name = CARD_HEADING[headingLevel];
  const entitlements = expanded
    ? card.entitlements
    : card.entitlements.slice(0, VISIBLE_ENTITLEMENT_COUNT);

  return (
    <li
      className={cx(
        "schematic-card schematic-plan-card",
        card.active && "schematic-plan-card--active",
      )}
      data-plan-id={card.id}
    >
      <div className="schematic-plan-card__header">
        <Name className="schematic-plan-card__name">{card.name}</Name>
        {shared.showDescription && card.description !== null && (
          <p className="schematic-plan-card__description">{card.description}</p>
        )}
        <Price price={card.price} t={t} />
        {shared.showCredits && card.credits.length > 0 && (
          <ul className="schematic-plan-card__credits">
            {card.credits.map((credit) => (
              <CreditItem
                credit={credit}
                key={`${credit.creditId}:${credit.perLicense ?? ""}`}
                showIcon={shared.showFeatureIcons}
                t={t}
              />
            ))}
          </ul>
        )}
        {card.active && (
          <span className="schematic-badge schematic-plan-card__badge">
            {kind === "plan" && view.trialDaysLeft !== null
              ? t("pricingTableTrialLeft", {
                  count: view.trialDaysLeft.count,
                  days: view.trialDaysLeft.days,
                })
              : t("pricingTableActive")}
          </span>
        )}
      </div>

      <div className="schematic-plan-card__body">
        <div className="schematic-plan-card__features">
          {shared.showEntitlements && card.entitlements.length > 0 && (
            <ul className="schematic-plan-card__entitlements" id={listId}>
              {inclusion !== null && (
                <li className="schematic-plan-card__inclusion">
                  {t("pricingTableEverythingIn", { plan: inclusion })}
                </li>
              )}
              {entitlements.map((row) => (
                <EntitlementItem
                  key={row.featureId}
                  row={row}
                  shared={shared}
                />
              ))}
            </ul>
          )}
          {shared.showEntitlements &&
            card.entitlements.length > VISIBLE_ENTITLEMENT_COUNT && (
              <button
                aria-controls={listId}
                aria-expanded={expanded}
                className="schematic-link-button schematic-plan-card__show-all"
                type="button"
                onClick={() => setExpanded((value) => !value)}
              >
                <i
                  aria-hidden="true"
                  className={`schematic-icon schematic-icon--${expanded ? "chevron-up" : "chevron-down"} schematic-chevron`}
                />
                <span className="schematic-link-button__label">
                  {expanded
                    ? t("pricingTableHideAll")
                    : t("pricingTableSeeAll")}
                </span>
              </button>
            )}
        </div>
        <Action card={card} kind={kind} shared={shared} />
      </div>
    </li>
  );
}

function Price({ price, t }: { price: PricingPrice; t: Translator }) {
  const per =
    price.kind === "amount" && price.period !== null
      ? periodWord(price.period, t)
      : undefined;
  return (
    <div className="schematic-plan-card__price">
      {price.kind === "usageBased"
        ? t("pricingTableUsageBased")
        : price.kind === "free"
          ? t("pricingTableFree")
          : price.amount}
      {per !== undefined && (
        <sub className="schematic-plan-card__period">/{per}</sub>
      )}
    </div>
  );
}

function CreditItem({
  credit,
  showIcon,
  t,
}: {
  credit: PricingCreditLine;
  showIcon: boolean;
  t: Translator;
}) {
  const text =
    credit.perLicense !== null
      ? credit.period !== null
        ? t("pricingTableCreditsPerLicensePerPeriod", {
            amount: credit.amount,
            creditName: credit.creditName,
            licenseName: credit.perLicense,
            period: periodWord(credit.period, t),
          })
        : t("pricingTableCreditsPerLicense", {
            amount: credit.amount,
            creditName: credit.creditName,
            licenseName: credit.perLicense,
          })
      : credit.period !== null
        ? t("pricingTableCreditsPerPeriod", {
            amount: credit.amount,
            creditName: credit.creditName,
            period: periodWord(credit.period, t),
          })
        : t("pricingTableCredits", {
            amount: credit.amount,
            creditName: credit.creditName,
          });
  return (
    <li className="schematic-plan-card__credit">
      {showIcon && credit.icon !== null && (
        <Icon className="schematic-plan-card__icon" name={credit.icon} />
      )}
      <div className="schematic-plan-card__feature">
        <span className="schematic-plan-card__feature-text">{text}</span>
        {credit.plus !== null && (
          <span className="schematic-muted schematic-plan-card__detail">
            {credit.plus.period === null
              ? t("pricingTableCreditsPlus", {
                  amount: credit.plus.amount,
                  creditName: credit.plus.creditName,
                })
              : t("pricingTableCreditsPlusPerPeriod", {
                  amount: credit.plus.amount,
                  creditName: credit.plus.creditName,
                  period: periodWord(credit.plus.period, t),
                })}
          </span>
        )}
      </div>
    </li>
  );
}

function EntitlementItem({
  row,
  shared,
}: {
  row: PricingEntitlementRow;
  shared: CardShared;
}) {
  const { locale, t } = shared;
  return (
    <li className="schematic-plan-card__entitlement">
      {shared.showFeatureIcons && row.icon !== null && (
        <Icon className="schematic-plan-card__icon" name={row.icon} />
      )}
      <div className="schematic-plan-card__feature">
        <span className="schematic-plan-card__feature-text">
          {entitlementText(row, t)}
        </span>
        {(row.detail !== null ||
          (shared.showHardLimit && row.hardLimit !== null)) && (
          <span className="schematic-muted schematic-plan-card__detail">
            {row.detail?.kind === "overage" &&
              t("pricingTableThen", {
                price: unitPrice(row.detail, t),
              })}
            {row.detail?.kind === "tiered" && t("pricingTableTierBased")}
            {row.tiers !== null && row.tiers.ranges.length > 0 && (
              <Tooltip label={t("usageTieredPricingLabel")}>
                <PriceTiers
                  currency={row.tiers.currency}
                  locale={locale}
                  mode={row.tiers.mode}
                  period={row.tiers.period}
                  ranges={row.tiers.ranges}
                  t={t}
                  unit={row.tiers.unit}
                />
              </Tooltip>
            )}
            {shared.showHardLimit && row.hardLimit !== null && (
              <Tooltip label={t("usageHardLimitLabel")}>
                {t("usageHardLimit", {
                  amount: row.hardLimit.amount,
                  units: row.hardLimit.units,
                })}
              </Tooltip>
            )}
          </span>
        )}
        {shared.showFeatureDescriptions && row.description !== null && (
          <p className="schematic-muted schematic-small schematic-plan-card__feature-description">
            {row.description}
          </p>
        )}
      </div>
    </li>
  );
}

function entitlementText(row: PricingEntitlementRow, t: Translator): string {
  const { text } = row;
  switch (text.kind) {
    case "name":
      return text.name;
    case "unlimited":
      return t("usageUnlimited", { item: text.item });
    case "units":
      if (text.amount === "") {
        return text.units;
      }
      return text.period === null
        ? t("usageUnits", { amount: text.amount, units: text.units })
        : t("pricingTableUnitsPerPeriod", {
            amount: text.amount,
            units: text.units,
            period: periodWord(text.period, t),
          });
    case "perUnit":
      if (text.period === null) {
        return text.size === null
          ? t("usagePerUnit", { cost: text.cost, unit: text.units })
          : t("usagePerPackage", {
              cost: text.cost,
              size: text.size,
              units: text.units,
            });
      }
      return text.size === null
        ? t("pricingTablePerUnitPerPeriod", {
            cost: text.cost,
            unit: text.units,
            period: periodWord(text.period, t),
          })
        : t("pricingTablePerPackagePerPeriod", {
            cost: text.cost,
            size: text.size,
            units: text.units,
            period: periodWord(text.period, t),
          });
    case "perUse":
      return t("pricingTablePerUse", {
        amount: text.amount,
        credits: text.credits,
        unit: text.unit,
      });
    case "upTo":
      return text.period === null
        ? t("pricingTableUpTo", { amount: text.amount, units: text.units })
        : t("pricingTableUpToPerPeriod", {
            amount: text.amount,
            units: text.units,
            period: periodWord(text.period, t),
          });
  }
}

/** "$0.50/API call", "$1.00/100 API calls/mo". */
function unitPrice(
  detail: Extract<PricingEntitlementRow["detail"], { kind: "overage" }>,
  t: Translator,
): string {
  const short =
    detail.period === null ? undefined : shortPeriod(detail.period, t);
  const units =
    detail.size === null ? detail.units : `${detail.size} ${detail.units}`;
  return `${detail.cost}/${units}${short === undefined ? "" : `/${short}`}`;
}

/**
 * A card's call to action: "Current plan" for the company's plan, else a
 * button for `onSelectPlan`, a link for `callToActionUrl`, or nothing.
 */
function Action({
  card,
  kind,
  shared,
}: {
  card: PricingCard;
  kind: "plan" | "addOn";
  shared: CardShared;
}) {
  const { locale, t, view } = shared;
  const action: PricingAction = card.action ?? {
    kind: "choose",
    upgrade: true,
  };

  if (action.kind === "current") {
    return (
      <div className="schematic-plan-card__current">
        <i
          aria-hidden="true"
          className="schematic-icon schematic-icon--check-rounded schematic-plan-card__check"
        />
        {t("pricingTableCurrentPlan")}
      </div>
    );
  }

  if (action.kind === "downgradeBlocked") {
    return (
      <div className="schematic-plan-card__action">
        <a
          className="schematic-cta schematic-cta--outline"
          href={action.url ?? undefined}
          rel="noreferrer"
          target="_blank"
        >
          {action.text ?? t("pricingTableTalkToSupport")}
        </a>
      </div>
    );
  }

  const select = () =>
    shared.onSelectPlan?.({
      kind,
      action: selectionAction(card),
      id: card.id,
      priceId: card.priceId,
      period: card.period,
      currency: view.currency,
      trialDays: card.trialDays,
      checkout: checkoutSelectionFor(view, card, kind),
    });
  if (
    shared.onSelectPlan === undefined &&
    shared.callToActionUrl === undefined
  ) {
    return null;
  }

  const disabled = action.kind === "overLimit" || action.kind === "unavailable";
  const label =
    action.kind === "overLimit"
      ? t("pricingTableOverLimit")
      : action.kind === "remove"
        ? t("pricingTableRemoveAddOn")
        : action.kind === "change"
          ? t("pricingTableChangeAddOn")
          : kind === "addOn"
            ? t("pricingTableChooseAddOn")
            : t("pricingTableChoosePlan");
  const className = cx(
    "schematic-cta",
    kind === "plan" &&
      action.kind === "choose" &&
      !action.upgrade &&
      "schematic-cta--outline",
    action.kind === "remove" && "schematic-cta--ghost",
    action.kind === "change" && "schematic-cta--outline",
  );

  return (
    <div className="schematic-plan-card__action">
      {shared.onSelectPlan !== undefined || disabled ? (
        <button
          className={className}
          disabled={disabled}
          type="button"
          onClick={select}
        >
          {label}
        </button>
      ) : (
        <a
          className={className}
          href={shared.callToActionUrl}
          target={shared.callToActionTarget}
        >
          {label}
        </a>
      )}
      {action.kind === "overLimit" && action.violations.length > 0 && (
        <p className="schematic-muted schematic-small schematic-plan-card__violations">
          {t("pricingTableOverLimitDetail", {
            features: conjunction(
              action.violations.map((violation) => violation.featureName),
              locale,
            ),
          })}
        </p>
      )}
    </div>
  );
}

/** The catalog's custom plan: its price text and a link to talk to sales. */
function CustomPlanCard({
  customPlan,
  shared,
}: {
  customPlan: PricingCustomPlan;
  shared: CardShared;
}) {
  const { headingLevel, t } = shared;
  const Name = CARD_HEADING[headingLevel];
  return (
    <li className="schematic-card schematic-plan-card schematic-plan-card--custom">
      <div className="schematic-plan-card__header">
        <Name className="schematic-plan-card__name">
          {t("pricingTableCustomPlan")}
        </Name>
        <div className="schematic-plan-card__price">
          {customPlan.priceText ?? t("pricingTableCustomPrice")}
        </div>
      </div>
      <div className="schematic-plan-card__body">
        {customPlan.ctaUrl !== null && (
          <div className="schematic-plan-card__action">
            <a
              className="schematic-cta"
              href={customPlan.ctaUrl}
              rel="noreferrer"
              target="_blank"
            >
              {customPlan.ctaText ?? t("pricingTableTalkToSupport")}
            </a>
          </div>
        )}
      </div>
    </li>
  );
}

/** "API call and Seat", in the locale's words. */
function conjunction(items: string[], locale: string): string {
  // Intl.ListFormat is ES2021, past this package's lib target.
  const { ListFormat } = Intl as unknown as {
    ListFormat?: new (
      locale: string,
      options: { type: "conjunction" },
    ) => { format: (items: string[]) => string };
  };
  return ListFormat === undefined
    ? items.join(", ")
    : new ListFormat(locale, { type: "conjunction" }).format(items);
}

function periodWord(period: string, t: Translator): string {
  const key = PERIOD_KEY[period];
  return key === undefined ? period : t(key);
}

/** Three cards' worth of name, price and rows. */
function PricingTableSkeleton() {
  return (
    <div className="schematic-skeleton">
      <div className="schematic-skeleton__heading" />
      {[0, 1, 2].map((index) => (
        <div className="schematic-skeleton__row" key={index}>
          <div className="schematic-skeleton__cell" data-column="name" />
          <div className="schematic-skeleton__cell" data-column="price" />
        </div>
      ))}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
PricingTable.resources = ["catalog", "publicCatalog", "company"] as const;

export default PricingTable;
