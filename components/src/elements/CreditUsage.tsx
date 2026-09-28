import {
  useCreditBalances,
  useCreditUserUsage,
  type CreditBalanceEntry,
} from "@schematichq/schematic-react";
import { useMemo, useState } from "react";

import {
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import {
  deriveCreditUsage,
  httpStatus,
  type CreditLedgerRow,
  type CreditUsageRow,
} from "./model";
import type { StringKey, Translator } from "./strings";
import { UserBreakdown, shortPeriod } from "./usage";

/** Ledger rows shown before "See all". */
const VISIBLE_GRANT_COUNT = 3;

export interface CreditUsageProps extends ElementProps {
  /** The "Credits" heading. Default true. */
  showHeader?: boolean;
  /** Heading level; each credit's name sits one below. Default 2. */
  headingLevel?: HeadingLevel;
  /** Each credit's icon; the circle is held even without one. Default true. */
  showIcon?: boolean;
  /** Each credit's description. Default true. */
  showDescription?: boolean;
  /** What is left of each credit. Default true. */
  showUsage?: boolean;
  /** The breakdown of consumption by user. Default true. */
  showUsageByUser?: boolean;
  /** Credit ids to show, in this order; every credit when absent. */
  visibleCredits?: string[];
  /**
   * "Buy More" on a credit a bundle sells calls this. Without it or
   * `buyMoreUrl` there is no button.
   */
  onBuyMore?: (credit: CreditBalanceEntry) => void;
  /** "Buy More" links here when there is no `onBuyMore`. */
  buyMoreUrl?: string;
  /** `target` for `buyMoreUrl`. */
  buyMoreTarget?: string;
}

const GRANT_KEY: Record<CreditLedgerRow["kind"], StringKey> = {
  autoTopup: "creditUsageGrantAutoTopup",
  bundle: "creditUsageGrantBundle",
  plan: "creditUsageGrantPlan",
  promotional: "creditUsageGrantPromotional",
};

/**
 * The company's credit balances in one card, a section per credit: what is
 * left, the grants behind it, how the plan's grants add up, and who on the
 * team spent it.
 *
 * A company with no credits, and a plan that draws on none, renders
 * nothing. A 404 means the account is not enabled for company reads, and
 * the card says so.
 */
export function CreditUsage({
  buyMoreTarget,
  buyMoreUrl,
  className,
  headingLevel = 2,
  locale: localeProp,
  onBuyMore,
  showDescription = true,
  showHeader = true,
  showIcon = true,
  showUsage = true,
  showUsageByUser = true,
  strings,
  visibleCredits,
}: CreditUsageProps) {
  const { data: balances, error, isPending, refetch } = useCreditBalances();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);

  const credits = useMemo(
    () =>
      balances === undefined
        ? []
        : deriveCreditUsage(balances, { locale, visibleCredits }),
    [balances, locale, visibleCredits],
  );

  const unavailable = balances === undefined && httpStatus(error) === 404;
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("creditUsageUnavailable")
        : t("creditUsageError");

  if (balances !== undefined && error === undefined && credits.length === 0) {
    return null;
  }

  const Heading = `h${headingLevel}` as const;
  const CreditHeading =
    `h${Math.min(6, headingLevel + 1) as HeadingLevel}` as const;

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-credit-usage", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={balances !== undefined}
      isPending={isPending}
      loadingLabel={t("creditUsageLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={<CreditUsageSkeleton showHeader={showHeader} />}
    >
      {showHeader && (
        <div className="schematic-header">
          <Heading className="schematic-header__title">
            {t("creditUsageHeader")}
          </Heading>
        </div>
      )}
      <div className="schematic-credit-usage__credits">
        {credits.map((credit) => (
          <section
            aria-label={credit.name}
            className="schematic-credit-usage__credit"
            data-testid="schematic-credit"
            key={credit.creditId}
          >
            <div className="schematic-credit-usage__main">
              {showIcon && (
                <span className="schematic-credit-usage__icon">
                  {credit.icon !== null && (
                    <i
                      aria-hidden="true"
                      className={`schematic-icon schematic-icon--${credit.icon}`}
                    />
                  )}
                </span>
              )}
              <div className="schematic-credit-usage__body">
                <div className="schematic-credit-usage__title">
                  <CreditHeading className="schematic-credit-usage__name">
                    {credit.name}
                  </CreditHeading>
                  {showDescription && credit.description !== null && (
                    <p className="schematic-muted">{credit.description}</p>
                  )}
                </div>
                <div className="schematic-credit-usage__balance">
                  {showUsage && (
                    <span
                      className="schematic-credit-usage__remaining"
                      data-testid="schematic-credit-remaining"
                    >
                      {t("creditUsageRemaining", credit.remaining)}
                    </span>
                  )}
                  {credit.purchasable && (
                    <BuyMore
                      credit={credit}
                      label={t("creditUsageBuyMore")}
                      onBuyMore={onBuyMore}
                      target={buyMoreTarget}
                      url={buyMoreUrl}
                    />
                  )}
                </div>
                {credit.composition !== null && (
                  <p className="schematic-muted schematic-small schematic-credit-usage__composition">
                    {compositionText(credit, t)}
                  </p>
                )}
              </div>
            </div>
            {credit.ledger.length > 0 && <Ledger credit={credit} t={t} />}
            {showUsageByUser && (
              <CreditUserBreakdown credit={credit} locale={locale} t={t} />
            )}
          </section>
        ))}
      </div>
    </StatusFrame>
  );
}

/** "Your plan includes 220 AI credits/mo — 12 Seats × 10 + 100 company grant. Renews on the 1st." */
function compositionText(credit: CreditUsageRow, t: Translator): string {
  const composition = credit.composition;
  if (composition === null) {
    return "";
  }
  const parts = [t("creditUsagePerLicense", composition.perLicense)];
  if (composition.companyGrant !== null) {
    parts.push(
      t("creditUsageCompanyGrant", { amount: composition.companyGrant }),
    );
  }
  const sentence = t("creditUsageComposition", {
    composition: ` — ${parts.join(" + ")}`,
    creditName: composition.creditName,
    period: shortPeriod(composition.period, t) ?? composition.period,
    total: composition.total,
  });
  return composition.renewsOn === null
    ? sentence
    : `${sentence} ${t("creditUsageRenewsOn", { day: composition.renewsOn })}`;
}

/**
 * The grants behind a balance, newest first, behind "See balance details".
 * Closing it collapses the list again, so it reopens summarized.
 */
function Ledger({ credit, t }: { credit: CreditUsageRow; t: Translator }) {
  const [open, setOpen] = useState(false);
  const [all, setAll] = useState(false);
  const rows = all
    ? credit.ledger
    : credit.ledger.slice(0, VISIBLE_GRANT_COUNT);
  return (
    <div className="schematic-credit-usage__ledger">
      <button
        aria-expanded={open}
        className="schematic-link-button schematic-credit-usage__details"
        type="button"
        onClick={() => {
          setOpen((value) => !value);
          setAll(false);
        }}
      >
        <i
          aria-hidden="true"
          className={`schematic-icon schematic-icon--${open ? "chevron-up" : "chevron-down"}`}
        />
        {open ? t("creditUsageHideDetails") : t("creditUsageSeeDetails")}
      </button>
      {open && (
        <div className="schematic-credit-usage__grants">
          <ul className="schematic-credit-usage__grant-list">
            {rows.map((row) => (
              <li
                className="schematic-credit-usage__grant"
                data-testid="schematic-credit-grant"
                key={row.id}
              >
                <span>
                  {t(GRANT_KEY[row.kind], {
                    amount: row.amount,
                    createdAt: row.createdAt,
                    item: row.item,
                  })}
                </span>
                {row.date !== null && (
                  <span className="schematic-credit-usage__grant-date">
                    {row.date.kind === "resets"
                      ? t("creditUsageResets", { date: row.date.text })
                      : t("creditUsageExpires", { date: row.date.text })}
                  </span>
                )}
              </li>
            ))}
          </ul>
          {credit.ledger.length > VISIBLE_GRANT_COUNT && (
            <button
              aria-expanded={all}
              className="schematic-link-button schematic-credit-usage__see-all"
              type="button"
              onClick={() => setAll((value) => !value)}
            >
              <i
                aria-hidden="true"
                className={`schematic-icon schematic-icon--${all ? "chevron-up" : "chevron-down"}`}
              />
              {all
                ? t("creditUsageHideAll")
                : t("creditUsageSeeAll", { total: credit.ledger.length })}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

function BuyMore({
  credit,
  label,
  onBuyMore,
  target,
  url,
}: {
  credit: CreditUsageRow;
  label: string;
  onBuyMore: CreditUsageProps["onBuyMore"];
  target: string | undefined;
  url: string | undefined;
}) {
  if (onBuyMore !== undefined) {
    return (
      <button
        className="schematic-cta schematic-cta--small schematic-credit-usage__buy-more"
        type="button"
        onClick={() => onBuyMore(credit.source)}
      >
        {label}
      </button>
    );
  }
  if (url !== undefined) {
    return (
      <a
        className="schematic-cta schematic-cta--small schematic-credit-usage__buy-more"
        href={url}
        target={target}
      >
        {label}
      </a>
    );
  }
  return null;
}

/** Who on the team spent a credit over the span of its live grants. */
function CreditUserBreakdown({
  credit,
  locale,
  t,
}: {
  credit: CreditUsageRow;
  locale: string;
  t: Translator;
}) {
  const { data, error, refetch } = useCreditUserUsage(credit.creditId);
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
                amount: user.used,
                id: user.userId,
                label: user.name ?? user.userId,
              })),
            }
      }
      error={error}
      locale={locale}
      onRetry={refetch}
      t={t}
      unit={credit.unit}
    />
  );
}

/** A heading and two credits' worth of placeholder. */
function CreditUsageSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      {[0, 1].map((index) => (
        <div className="schematic-skeleton__row" key={index}>
          <div className="schematic-skeleton__cell" data-column="name" />
          <div className="schematic-skeleton__cell" data-column="remaining" />
        </div>
      ))}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
CreditUsage.resources = ["creditBalances"] as const;

export default CreditUsage;
