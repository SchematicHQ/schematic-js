import { useCreditLedger } from "@schematichq/schematic-react";
import { useId, useMemo, useState } from "react";

import {
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import {
  deriveCreditLog,
  httpStatus,
  type CreditLogAction,
  type CreditLogRow,
  type CreditLogWho,
} from "./model";
import type { StringKey, Translator } from "./strings";

export interface CreditLogProps extends ElementProps {
  /** Credit ids to show; every credit when absent. */
  credits?: string[];
  /** Rows shown before "See full log". Default 3. */
  limit?: number;
  /** Who each draw is attributed to. Default true. */
  showUser?: boolean;
  /** Grants, top-ups and expiries beside the draws. Default true. */
  showGrants?: boolean;
  /** The "Credit activity" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /**
   * "See all" calls this instead of "See full log" opening the log in place, for
   * a host with a page of its own for it.
   */
  onSeeAll?: () => void;
  /** "See all" links here when there is no `onSeeAll`. */
  seeAllUrl?: string;
  /** `target` for `seeAllUrl`. */
  seeAllTarget?: string;
}

/** Skeleton rows, further capped by `limit` at the call site. */
const SKELETON_ROWS = 3;

const ACTION_KEY: Record<CreditLogAction, StringKey> = {
  adjustmentGrant: "creditLogActionAdjustmentGrant",
  autoTopup: "creditLogActionAutoTopup",
  expired: "creditLogActionExpired",
  freeGrant: "creditLogActionFreeGrant",
  licenseRetired: "creditLogActionLicenseRetired",
  planChange: "creditLogActionPlanChange",
  planGrant: "creditLogActionPlanGrant",
  purchase: "creditLogActionPurchase",
  refund: "creditLogActionRefund",
  removed: "creditLogActionRemoved",
  reset: "creditLogActionReset",
  rollover: "creditLogActionRollover",
  usage: "creditLogActionUsage",
  usageAdjustment: "creditLogActionUsageAdjustment",
};

/** The action's copy when it has no feature or bundle to name. */
const UNNAMED_KEY: Partial<Record<CreditLogAction, StringKey>> = {
  autoTopup: "creditLogActionAutoTopupUnnamed",
  purchase: "creditLogActionPurchaseUnnamed",
  refund: "creditLogActionRefundUnnamed",
};

const WHO_KEY: Record<Exclude<CreditLogWho["kind"], "user">, StringKey> = {
  autoTopup: "creditLogWhoAutoTopup",
  manual: "creditLogWhoManual",
  plan: "creditLogWhoPlan",
  purchase: "creditLogWhoPurchase",
};

/**
 * The company's recent credit activity, newest first: what drew credits and
 * who, plus grants, top-ups and expiries. `limit` rows show at first; "See
 * full log" opens a table that pages back through the rest, or "See all" hands
 * off to the host through `onSeeAll` or `seeAllUrl`.
 *
 * Amounts are bare numbers. A log in one credit names it once, beside the
 * heading; a log across several names each row's credit beside its time
 * and in a Credit column.
 */
export function CreditLog({
  className,
  credits,
  headingLevel = 2,
  limit = 3,
  locale: localeProp,
  onSeeAll,
  seeAllTarget,
  seeAllUrl,
  showGrants = true,
  showHeader = true,
  showUser = true,
  strings,
}: CreditLogProps) {
  const query = useMemo(
    () => ({
      ...(credits === undefined ? {} : { credits }),
      ...(showGrants ? {} : { includeGrants: false }),
    }),
    [credits, showGrants],
  );
  const {
    data: page,
    error,
    isPending,
    loadMore,
    refetch,
  } = useCreditLedger(query);
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);
  const [full, setFull] = useState(false);

  const log = useMemo(
    () => (page === undefined ? undefined : deriveCreditLog(page, { locale })),
    [locale, page],
  );

  const headingId = useId();
  const Heading = `h${headingLevel}` as const;
  const rows = log?.rows ?? [];
  // One credit is named once, in the header. Several, or one with no header
  // to name it in, are named on each row; amounts stay bare either way.
  const showCredit = log?.credit === null || !showHeader;
  const hasMoreRows = rows.length > limit || log?.hasMore === true;
  const handedOff = onSeeAll !== undefined || seeAllUrl !== undefined;
  const label = showHeader ? undefined : t("creditLogHeader");
  const labelledBy = showHeader ? headingId : undefined;

  const unavailable = log === undefined && httpStatus(error) === 404;
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("creditLogUnavailable")
        : t("creditLogError");

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-credit-log", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={log !== undefined}
      isPending={isPending}
      loadingLabel={t("creditLogLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={
        <CreditLogSkeleton
          rows={Math.max(1, Math.min(limit, SKELETON_ROWS))}
          showHeader={showHeader}
        />
      }
    >
      {log !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <Heading className="schematic-header__title" id={headingId}>
                {t("creditLogHeader")}
              </Heading>
              {log.credit !== null && (
                <span className="schematic-muted schematic-small schematic-credit-log__credit-name">
                  {log.credit.name}
                </span>
              )}
            </div>
          )}
          {rows.length === 0 ? (
            <p className="schematic-muted schematic-credit-log__empty">
              {t("creditLogEmpty")}
            </p>
          ) : full ? (
            <>
              <table
                className="schematic-small schematic-credit-log__table"
                aria-label={label}
                aria-labelledby={labelledBy}
              >
                <thead>
                  <tr>
                    <th className="schematic-credit-log__heading" scope="col">
                      {t("creditLogColumnDate")}
                    </th>
                    <th className="schematic-credit-log__heading" scope="col">
                      {t("creditLogColumnActivity")}
                    </th>
                    {showUser && (
                      <th className="schematic-credit-log__heading" scope="col">
                        {t("creditLogColumnBy")}
                      </th>
                    )}
                    {showCredit && (
                      <th className="schematic-credit-log__heading" scope="col">
                        {t("creditLogColumnCredit")}
                      </th>
                    )}
                    <th
                      className="schematic-credit-log__heading schematic-credit-log__amount-heading"
                      scope="col"
                    >
                      {t("creditLogColumnAmount")}
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((row) => (
                    <tr data-testid="schematic-credit-log-entry" key={row.id}>
                      <td className="schematic-muted schematic-credit-log__cell schematic-credit-log__when">
                        {whenText(row, t)}
                      </td>
                      <td className="schematic-credit-log__cell">
                        {actionText(row, t)}
                      </td>
                      {showUser && (
                        <td className="schematic-muted schematic-credit-log__cell">
                          {whoText(row.who, t) ?? "—"}
                        </td>
                      )}
                      {showCredit && (
                        <td className="schematic-muted schematic-credit-log__cell">
                          {row.creditName}
                        </td>
                      )}
                      <td className="schematic-credit-log__cell schematic-credit-log__amount-cell">
                        <Amount row={row} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="schematic-credit-log__actions">
                <Toggle
                  expanded
                  label={t("creditLogSeeLess")}
                  onClick={() => setFull(false)}
                />
                {log.hasMore && (
                  <button
                    className="schematic-link-button schematic-credit-log__load-more"
                    disabled={isPending}
                    type="button"
                    onClick={() => void loadMore()}
                  >
                    {t("creditLogLoadMore")}
                  </button>
                )}
              </div>
            </>
          ) : (
            <>
              <ul
                className="schematic-credit-log__list"
                aria-label={label}
                aria-labelledby={labelledBy}
              >
                {rows.slice(0, limit).map((row) => {
                  const detail = [
                    whenText(row, t),
                    showUser ? whoText(row.who, t) : undefined,
                    showCredit ? row.creditName : undefined,
                  ].filter((part) => part !== undefined && part !== "");
                  return (
                    <li
                      className="schematic-credit-log__row"
                      data-testid="schematic-credit-log-entry"
                      key={row.id}
                    >
                      <span className="schematic-credit-log__what">
                        <span className="schematic-credit-log__action">
                          {actionText(row, t)}
                        </span>
                        <span className="schematic-muted schematic-small schematic-credit-log__detail">
                          {detail.join(" · ")}
                        </span>
                      </span>
                      <Amount row={row} />
                    </li>
                  );
                })}
              </ul>
              {hasMoreRows && (
                <div className="schematic-credit-log__actions">
                  {handedOff ? (
                    <SeeAll
                      label={t("creditLogSeeAll")}
                      onSeeAll={onSeeAll}
                      seeAllTarget={seeAllTarget}
                      seeAllUrl={seeAllUrl}
                    />
                  ) : (
                    <Toggle
                      expanded={false}
                      label={t("creditLogSeeMore")}
                      onClick={() => setFull(true)}
                    />
                  )}
                </div>
              )}
            </>
          )}
        </>
      )}
    </StatusFrame>
  );
}

/** The chevron toggle the other elements expand their lists with. */
function Toggle({
  expanded,
  label,
  onClick,
}: {
  expanded: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-expanded={expanded}
      className="schematic-link-button schematic-credit-log__toggle"
      type="button"
      onClick={onClick}
    >
      <i
        aria-hidden="true"
        className={`schematic-icon schematic-icon--${expanded ? "chevron-up" : "chevron-down"} schematic-chevron`}
      />
      <span className="schematic-link-button__label">{label}</span>
    </button>
  );
}

/** "See all", handing the full log to the host's own page. */
function SeeAll({
  label,
  onSeeAll,
  seeAllTarget,
  seeAllUrl,
}: {
  label: string;
  onSeeAll?: () => void;
  seeAllTarget?: string;
  seeAllUrl?: string;
}) {
  if (onSeeAll === undefined) {
    return (
      <a
        className="schematic-link-button schematic-credit-log__see-all-link"
        href={seeAllUrl}
        rel={seeAllTarget === "_blank" ? "noreferrer" : undefined}
        target={seeAllTarget}
      >
        {label}
      </a>
    );
  }
  return (
    <button
      className="schematic-link-button schematic-credit-log__see-all-button"
      type="button"
      onClick={onSeeAll}
    >
      {label}
    </button>
  );
}

/** The signed amount alone; the row or the header names its credit. */
function Amount({ row }: { row: CreditLogRow }) {
  return (
    <span
      className={cx(
        "schematic-credit-log__amount",
        row.positive && "schematic-credit-log__amount--positive",
      )}
    >
      {`${row.positive ? "+" : "−"}${row.amountText}`}
    </span>
  );
}

function actionText(row: CreditLogRow, t: Translator): string {
  if (row.action === "usage") {
    return row.subject ?? t("creditLogActionUsage");
  }
  const unnamed = UNNAMED_KEY[row.action];
  if (row.subject === null && unnamed !== undefined) {
    return t(unnamed);
  }
  return t(ACTION_KEY[row.action], {
    bundle: row.subject,
    feature: row.subject,
  });
}

function whenText(row: CreditLogRow, t: Translator): string {
  if (row.day === "today") {
    return t("creditLogToday", { time: row.whenText });
  }
  if (row.day === "yesterday") {
    return t("creditLogYesterday", { time: row.whenText });
  }
  return row.whenText;
}

function whoText(who: CreditLogWho | null, t: Translator): string | undefined {
  if (who === null) {
    return undefined;
  }
  return who.kind === "user" ? who.name : t(WHO_KEY[who.kind]);
}

function CreditLogSkeleton({
  rows,
  showHeader,
}: {
  rows: number;
  showHeader: boolean;
}) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      {Array.from({ length: rows }, (_, row) => (
        <div className="schematic-skeleton__row" key={row}>
          <div className="schematic-skeleton__cell" data-column="action" />
          <div className="schematic-skeleton__cell" data-column="amount" />
        </div>
      ))}
    </div>
  );
}

/** What the element reads, for `fetchBillingData` on a server-rendered page. */
CreditLog.resources = ["creditLedger"] as const;

export default CreditLog;
