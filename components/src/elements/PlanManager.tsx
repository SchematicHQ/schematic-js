import {
  useCompany,
  useCreditBalances,
  useFeatureUsage,
} from "@schematichq/schematic-react";
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
  derivePlanManager,
  formatNumber,
  httpStatus,
  type CreditGroupRow,
  type PlanCreditRow,
  type PlanNotice,
  type PlanPrice,
  type TrialUnit,
  type UsageBasedRow,
} from "./model";
import type { StringKey, Translator } from "./strings";
import { PriceTiers, shortPeriod } from "./usage";

/** Rows a credit section shows before "See all". */
const VISIBLE_CREDIT_COUNT = 3;

export interface PlanManagerProps extends ElementProps {
  /** Heading level of the plan's name; a notice's title sits one below. Default 2. */
  headingLevel?: HeadingLevel;
  /**
   * The notice above the plan: a trial, a cancellation, a custom plan's
   * invoice or a scheduled downgrade. Default true.
   */
  showNotice?: boolean;
  /** The plan's name, description and price. Default true. */
  showHeader?: boolean;
  /** The plan's description. Default true. */
  showDescription?: boolean;
  /** The plan's price. Default true. */
  showPrice?: boolean;
  /** The add-ons the company holds. Default true. */
  showAddOns?: boolean;
  /** The usage-based features and their prices. Default true. */
  showUsageBased?: boolean;
  /**
   * Every credit section — the plan's credits, top-ups, bundles and
   * promotional credits — and the "credits per use" on credit-burning
   * features. Default true.
   */
  showCredits?: boolean;
  /** Each section's label. Default true. */
  showLabels?: boolean;
  /** A plan priced at zero reads "Free". Default false. */
  showZeroPriceAsFree?: boolean;
  /** An info tip with the hard limit on features billed past it. Default false. */
  showHardLimit?: boolean;
  /**
   * Show an entitlement's warning threshold in place of its limit, where one
   * is configured. Default false.
   */
  showWarningThresholdAsLimit?: boolean;
  /** "Change plan" calls this. Without it or `changePlanUrl` there is no button. */
  onChangePlan?: () => void;
  /** "Change plan" links here when there is no `onChangePlan`. */
  changePlanUrl?: string;
  /** `target` for `changePlanUrl`. */
  changePlanTarget?: string;
  /**
   * "Edit" on the auto top-up settings calls this. Without it or
   * `editAutoTopupUrl` there is no button.
   */
  onEditAutoTopup?: () => void;
  /** "Edit" links here when there is no `onEditAutoTopup`. */
  editAutoTopupUrl?: string;
  /** `target` for `editAutoTopupUrl`. */
  editAutoTopupTarget?: string;
}

const UNIT_KEY: Record<TrialUnit, StringKey> = {
  day: "planManagerDays",
  hour: "planManagerHours",
  minute: "planManagerMinutes",
};

const PERIOD_KEY: Record<string, StringKey> = {
  day: "periodDay",
  month: "periodMonth",
  quarter: "periodQuarter",
  week: "periodWeek",
  year: "periodYear",
};

/**
 * The company's plan: a notice about where its subscription is headed, the
 * plan and its price, its add-ons, its usage-based features, and the
 * credits the plan and the company's purchases bring.
 *
 * It reads the company, its usage and its credits, and waits for all three.
 * A 404 means the account is not enabled for company reads, and the card
 * says so.
 */
export function PlanManager({
  changePlanTarget,
  changePlanUrl,
  className,
  editAutoTopupTarget,
  editAutoTopupUrl,
  headingLevel = 2,
  locale: localeProp,
  onChangePlan,
  onEditAutoTopup,
  showAddOns = true,
  showCredits = true,
  showDescription = true,
  showHardLimit = false,
  showHeader = true,
  showLabels = true,
  showNotice = true,
  showPrice = true,
  showUsageBased = true,
  showWarningThresholdAsLimit = false,
  showZeroPriceAsFree = false,
  strings,
}: PlanManagerProps) {
  const company = useCompany();
  const usage = useFeatureUsage();
  const credits = useCreditBalances();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);

  const view = useMemo(
    () =>
      company.data === undefined ||
      usage.data === undefined ||
      credits.data === undefined
        ? undefined
        : derivePlanManager(
            {
              company: company.data,
              creditBalances: credits.data,
              featureUsage: usage.data,
            },
            {
              locale,
              showCredits,
              showWarningThresholdAsLimit,
              showZeroPriceAsFree,
            },
          ),
    [
      company.data,
      credits.data,
      locale,
      showCredits,
      showWarningThresholdAsLimit,
      showZeroPriceAsFree,
      usage.data,
    ],
  );

  const error = company.error ?? usage.error ?? credits.error;
  const unavailable = view === undefined && httpStatus(error) === 404;
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("planManagerUnavailable")
        : t("planManagerError");
  const retry = () => {
    for (const handle of [company, usage, credits]) {
      if (handle.error !== undefined) {
        handle.refetch();
      }
    }
  };

  const Heading = `h${headingLevel}` as const;
  const NoticeHeading =
    `h${Math.min(6, headingLevel + 1) as HeadingLevel}` as const;

  return (
    <StatusFrame
      className={cx("schematic-plan-manager", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={view !== undefined}
      isPending={company.isPending || usage.isPending || credits.isPending}
      loadingLabel={t("planManagerLoading")}
      onRetry={retry}
      retryText={t("retry")}
      skeleton={<PlanManagerSkeleton />}
    >
      {view !== undefined && (
        <>
          {showNotice && view.notice !== null && (
            <Notice
              Heading={NoticeHeading}
              locale={locale}
              notice={view.notice}
              t={t}
            />
          )}
          <div className="schematic-card schematic-plan-manager__card">
            {showHeader && view.plan !== null && (
              <div className="schematic-plan-manager__plan">
                <div className="schematic-plan-manager__title">
                  <Heading className="schematic-plan-manager__name">
                    {view.plan.name}
                  </Heading>
                  {showDescription && view.plan.description !== null && (
                    <p className="schematic-plan-manager__description">
                      {view.plan.description}
                    </p>
                  )}
                </div>
                {showPrice && view.plan.price !== null && (
                  <Price price={view.plan.price} t={t} />
                )}
              </div>
            )}

            {showAddOns && view.addOns.length > 0 && (
              <Section label={t("planManagerAddOns")} showLabel={showLabels}>
                {view.addOns.map((addOn) => (
                  <li className="schematic-plan-manager__row" key={addOn.id}>
                    <span className="schematic-plan-manager__item">
                      {addOn.name}
                    </span>
                    {addOn.price !== null && (
                      <span className="schematic-plan-manager__price-value">
                        {addOn.price.amount}
                        <PeriodSuffix period={addOn.price.period} t={t} />
                      </span>
                    )}
                  </li>
                ))}
              </Section>
            )}

            {showUsageBased && view.usageBased.length > 0 && (
              <Section
                label={t("planManagerUsageBased")}
                showLabel={showLabels}
              >
                {view.usageBased.map((row) => (
                  <UsageBasedItem
                    key={row.featureId}
                    locale={locale}
                    row={row}
                    showHardLimit={showHardLimit}
                    t={t}
                  />
                ))}
              </Section>
            )}

            {showCredits && view.planCredits.length > 0 && (
              <Truncated
                locale={locale}
                after={
                  view.autoTopup !== null && (
                    <AutoTopupBox
                      lines={view.autoTopup.lines}
                      onEdit={onEditAutoTopup}
                      t={t}
                      target={editAutoTopupTarget}
                      url={editAutoTopupUrl}
                    />
                  )
                }
                label={t("planManagerCreditsInPlan")}
                rows={view.planCredits}
                showLabel={showLabels}
                t={t}
              >
                {(row) => <PlanCreditItem key={row.creditId} row={row} t={t} />}
              </Truncated>
            )}

            {showCredits && view.topUps.length > 0 && (
              <Truncated
                locale={locale}
                label={t("planManagerTopUps")}
                rows={view.topUps}
                showLabel={showLabels}
                t={t}
              >
                {(row) => (
                  <CreditGroupItem countAlways key={row.key} row={row} t={t} />
                )}
              </Truncated>
            )}

            {showCredits && view.bundles.length > 0 && (
              <Truncated
                locale={locale}
                label={t("planManagerCreditBundles")}
                rows={view.bundles}
                showLabel={showLabels}
                t={t}
              >
                {(row) => <CreditGroupItem key={row.key} row={row} t={t} />}
              </Truncated>
            )}

            {showCredits && view.promotional.length > 0 && (
              <Truncated
                locale={locale}
                label={t("planManagerPromotionalCredits")}
                rows={view.promotional}
                showLabel={showLabels}
                t={t}
              >
                {(row) => (
                  <CreditGroupItem key={row.key} plain row={row} t={t} />
                )}
              </Truncated>
            )}

            {view.canChangePlan && (
              <Cta
                className="schematic-cta schematic-plan-manager__change-plan"
                label={t("planManagerChangePlan")}
                onClick={onChangePlan}
                target={changePlanTarget}
                url={changePlanUrl}
              />
            )}
          </div>
        </>
      )}
    </StatusFrame>
  );
}

function Notice({
  Heading,
  locale,
  notice,
  t,
}: {
  Heading: `h${HeadingLevel}`;
  locale: string;
  notice: PlanNotice;
  t: Translator;
}) {
  let title: string | null = null;
  let body: string | null = null;
  let payUrl: string | null = null;
  switch (notice.kind) {
    case "trial":
      title =
        notice.endsIn === null
          ? null
          : notice.endsIn === "soon"
            ? t("planManagerTrialEndsSoon")
            : notice.endsIn === "ended"
              ? t("planManagerTrialEnded")
              : t("planManagerTrialEndsIn", {
                  amount: formatNumber(notice.endsIn.amount, locale),
                  units: t(UNIT_KEY[notice.endsIn.unit], {
                    count: notice.endsIn.amount,
                  }),
                });
      break;
    case "canceled":
      title = t("planManagerCanceled");
      body =
        notice.date === null
          ? null
          : t("planManagerAccessEnds", {
              date: notice.date,
              plan: notice.planName ?? t("planManagerPlanFallback"),
            });
      break;
    case "customPlanBilling": {
      const plan = notice.planName ?? t("planManagerYourPlan");
      title = notice.awaitingActivation
        ? t("planManagerCustomAwaiting", { plan })
        : t("planManagerCustomDue", { date: notice.date, plan });
      body = notice.awaitingActivation
        ? t("planManagerCustomAwaitingDescription", { date: notice.date })
        : t("planManagerCustomDueDescription", { date: notice.date, plan });
      payUrl = notice.invoiceUrl;
      break;
    }
    case "scheduledDowngrade":
      title = t("planManagerDowngradeScheduled", { plan: notice.toPlanName });
      body =
        notice.date === null
          ? null
          : t("planManagerAccessEnds", {
              date: notice.date,
              plan: notice.fromPlanName,
            });
      break;
  }
  if (title === null && body === null) {
    return null;
  }
  return (
    <div
      className="schematic-plan-manager__notice"
      data-kind={notice.kind}
      role="status"
    >
      {title !== null && (
        <Heading className="schematic-plan-manager__notice-title">
          {title}
        </Heading>
      )}
      {body !== null && (
        <p className="schematic-small schematic-plan-manager__notice-body">
          {body}
        </p>
      )}
      {payUrl !== null && (
        <a
          className="schematic-cta schematic-plan-manager__pay-now"
          href={payUrl}
          rel="noreferrer"
          target="_blank"
        >
          {t("planManagerPayNow")}
        </a>
      )}
    </div>
  );
}

function Price({ price, t }: { price: PlanPrice; t: Translator }) {
  return (
    <div className="schematic-plan-manager__price">
      {price.kind === "usageBased"
        ? t("planManagerUsageBased")
        : price.kind === "free"
          ? t("planManagerFree")
          : price.amount}
      {price.kind === "amount" && price.period !== null && (
        <PeriodSuffix period={price.period} t={t} />
      )}
    </div>
  );
}

/** "/mo"; nothing for a one-time price or a period without an abbreviation. */
function PeriodSuffix({ period, t }: { period: string; t: Translator }) {
  const short = shortPeriod(period, t);
  return short === undefined ? null : <sub>/{short}</sub>;
}

function Section({
  children,
  label,
  showLabel,
}: {
  children: React.ReactNode;
  label: string;
  showLabel: boolean;
}) {
  return (
    <section aria-label={label} className="schematic-plan-manager__section">
      {showLabel && (
        <span className="schematic-muted schematic-plan-manager__label">
          {label}
        </span>
      )}
      <ul className="schematic-plan-manager__rows">{children}</ul>
    </section>
  );
}

/** A section of rows that shows three before "See all (N)". */
function Truncated<Row>({
  after,
  children,
  label,
  locale,
  rows,
  showLabel,
  t,
}: {
  after?: React.ReactNode;
  children: (row: Row) => React.ReactNode;
  label: string;
  locale: string;
  rows: Row[];
  showLabel: boolean;
  t: Translator;
}) {
  const [expanded, setExpanded] = useState(false);
  const shown = expanded ? rows : rows.slice(0, VISIBLE_CREDIT_COUNT);
  return (
    <section aria-label={label} className="schematic-plan-manager__section">
      {showLabel && (
        <span className="schematic-muted schematic-plan-manager__label">
          {label}
        </span>
      )}
      <ul className="schematic-plan-manager__rows">{shown.map(children)}</ul>
      {rows.length > VISIBLE_CREDIT_COUNT && (
        <button
          aria-expanded={expanded}
          className="schematic-link-button schematic-plan-manager__see-all"
          type="button"
          onClick={() => setExpanded((value) => !value)}
        >
          <i
            aria-hidden="true"
            className={`schematic-icon schematic-icon--${expanded ? "chevron-up" : "chevron-down"} schematic-chevron`}
          />
          <span className="schematic-link-button__label">
            {expanded
              ? t("planManagerHideAll")
              : t("planManagerSeeAll", {
                  total: formatNumber(rows.length, locale),
                })}
          </span>
        </button>
      )}
      {after}
    </section>
  );
}

function UsageBasedItem({
  locale,
  row,
  showHardLimit,
  t,
}: {
  locale: string;
  row: UsageBasedRow;
  showHardLimit: boolean;
  t: Translator;
}) {
  const details: React.ReactNode[] = [];
  if (row.additional) {
    details.push(`${t("planManagerAdditional")}: `);
  }
  if (row.tierBased) {
    details.push(t("planManagerTierBased"));
  }
  if (row.unitPrice !== null) {
    const short =
      row.unitPrice.period === null
        ? undefined
        : shortPeriod(row.unitPrice.period, t);
    details.push(
      <span key="price">
        {row.unitPrice.cost}
        <sub>
          /
          {row.unitPrice.packageSize !== null &&
            `${row.unitPrice.packageSize} `}
          {row.unitPrice.units}
          {short !== undefined && `/${short}`}
        </sub>
      </span>,
    );
  }
  if (row.perUse !== null) {
    details.push(
      t("usagePerUse", { amount: row.perUse.amount, units: row.perUse.units }),
    );
  }
  const costPeriod =
    row.cost?.period === null || row.cost === null
      ? undefined
      : shortPeriod(row.cost.period, t);
  return (
    <li
      className="schematic-plan-manager__row"
      data-testid="schematic-usage-based"
    >
      <span className="schematic-plan-manager__item">
        {row.quantity === null
          ? row.name
          : `${row.quantity.amount} ${row.quantity.units}`}
      </span>
      <span className="schematic-plan-manager__detail">
        {details.length > 0 && (
          <span className="schematic-muted schematic-small">{details}</span>
        )}
        {row.cost !== null && (
          <>
            {" "}
            {row.cost.amount}
            {costPeriod !== undefined && <sub>/{costPeriod}</sub>}
          </>
        )}
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
        {showHardLimit && row.hardLimit !== null && (
          <Tooltip label={t("usageHardLimitLabel")}>
            {t("usageHardLimit", {
              amount: row.hardLimit.amount,
              units: row.hardLimit.units,
            })}
          </Tooltip>
        )}
      </span>
    </li>
  );
}

function PlanCreditItem({ row, t }: { row: PlanCreditRow; t: Translator }) {
  const text = row.text;
  const composition = row.composition;
  return (
    <li
      className="schematic-plan-manager__row schematic-plan-manager__row--stacked"
      data-testid="schematic-plan-credit"
    >
      <div className="schematic-plan-manager__row-main">
        <span className="schematic-plan-manager__item">
          {text.kind === "perLicense" ? (
            <>
              {t("planManagerCreditsPerLicense", {
                amount: text.amount,
                creditName: text.creditName,
                licenseName: text.licenseName,
              })}
              {text.plus !== null &&
                ` ${t("planManagerCreditsPlusPerPeriod", {
                  amount: text.plus.amount,
                  creditName: text.plus.creditName,
                  period: periodWord(text.plus.period, t),
                })}`}
            </>
          ) : text.period === null ? (
            t("planManagerCredits", {
              amount: text.amount,
              creditName: text.creditName,
            })
          ) : (
            t("planManagerCreditsPerPeriod", {
              amount: text.amount,
              creditName: text.creditName,
              period: periodWord(text.period, t),
            })
          )}
        </span>
        {row.used !== null && (
          <span className="schematic-muted schematic-small schematic-plan-manager__used">
            {t("planManagerUsed", { amount: row.used })}
            {row.autoTopup !== null && (
              <Tooltip label={t("planManagerAutoTopup")}>
                {t("planManagerAutoTopupTip", {
                  amount: row.autoTopup.amount,
                  threshold: row.autoTopup.threshold,
                })}
              </Tooltip>
            )}
          </span>
        )}
      </div>
      {composition !== null && (
        <span className="schematic-muted schematic-small">
          {t(
            composition.fixed === null
              ? "planManagerLicensesTimesCredits"
              : "planManagerLicensesTimesCreditsPlusCompany",
            {
              creditName: composition.creditName,
              fixed: composition.fixed ?? undefined,
              licenseName: composition.licenseName,
              period:
                shortPeriod(composition.period, t) ??
                periodWord(composition.period, t),
              perUnit: composition.perUnit,
              quantity: composition.quantity,
              total: composition.total,
            },
          )}
        </span>
      )}
    </li>
  );
}

/**
 * A bundle, top-up or promotional grant: "(2) 500 credit pack (500 AI
 * credits)". Top-ups count their grants whether or not the bundle is
 * named; bundles only beside a name; promotional grants never.
 */
function CreditGroupItem({
  countAlways = false,
  plain = false,
  row,
  t,
}: {
  countAlways?: boolean;
  plain?: boolean;
  row: CreditGroupRow;
  t: Translator;
}) {
  const named = !plain && row.bundleName !== null;
  const showCount = !plain && row.count > 1 && (named || countAlways);
  const amount = `${row.quantity} ${row.creditName}`;
  return (
    <li
      className="schematic-plan-manager__row"
      data-testid="schematic-credit-group"
    >
      <span className="schematic-plan-manager__item">
        {showCount && <span className="schematic-muted">({row.count}) </span>}
        {named ? `${row.bundleName} (${amount})` : amount}
      </span>
      {row.used !== null && (
        <span className="schematic-muted schematic-small schematic-plan-manager__used">
          {t("planManagerUsed", { amount: row.used })}
        </span>
      )}
    </li>
  );
}

function AutoTopupBox({
  lines,
  onEdit,
  t,
  target,
  url,
}: {
  lines: NonNullable<
    ReturnType<typeof derivePlanManager>["autoTopup"]
  >["lines"];
  onEdit: (() => void) | undefined;
  t: Translator;
  target: string | undefined;
  url: string | undefined;
}) {
  return (
    <div className="schematic-plan-manager__auto-topup">
      <div className="schematic-plan-manager__auto-topup-lines">
        <span className="schematic-plan-manager__item">
          {t("planManagerAutoTopup")}
        </span>
        {lines.map((line) => (
          <span key={line.creditId}>
            {line.kind === "disabled"
              ? t("planManagerAutoTopupDisabled", { unit: line.unit })
              : t("planManagerAutoTopupAdds", {
                  amount: line.amount,
                  threshold: line.threshold,
                  unit: line.unit,
                })}
          </span>
        ))}
      </div>
      <Cta
        className="schematic-cta schematic-cta--small schematic-cta--ghost schematic-plan-manager__edit"
        label={t("planManagerEdit")}
        onClick={onEdit}
        target={target}
        url={url}
      />
    </div>
  );
}

/** A button for a callback, else a link for a URL, else nothing. */
function Cta({
  className,
  label,
  onClick,
  target,
  url,
}: {
  className: string;
  label: string;
  onClick: (() => void) | undefined;
  target: string | undefined;
  url: string | undefined;
}) {
  if (onClick !== undefined) {
    return (
      <button className={className} type="button" onClick={onClick}>
        {label}
      </button>
    );
  }
  if (url !== undefined) {
    return (
      <a className={className} href={url} target={target}>
        {label}
      </a>
    );
  }
  return null;
}

function periodWord(period: string, t: Translator): string {
  const key = PERIOD_KEY[period];
  return key === undefined ? period : t(key);
}

/** The plan's name and price, and two rows beneath. */
function PlanManagerSkeleton() {
  return (
    <div className="schematic-skeleton">
      <div className="schematic-skeleton__heading" />
      {[0, 1].map((index) => (
        <div className="schematic-skeleton__row" key={index}>
          <div className="schematic-skeleton__cell" data-column="name" />
          <div className="schematic-skeleton__cell" data-column="price" />
        </div>
      ))}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
PlanManager.resources = ["company", "featureUsage", "creditBalances"] as const;

export default PlanManager;
