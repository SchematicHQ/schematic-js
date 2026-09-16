import { useInvoices, type InvoiceQuery } from "@schematichq/schematic-react";
import { useId, useMemo, useState } from "react";

import {
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import { deriveInvoiceList, httpStatus, type InvoiceRow } from "./model";
import type { Translator } from "./strings";

export interface InvoicesProps extends ElementProps {
  /** Rows shown before "See more". Default 10. */
  limit?: number;
  /** The "Invoices" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /** The date on each row. Default true. */
  showDate?: boolean;
  /** The amount on each row. Default true. */
  showAmount?: boolean;
  /** Collapse to `limit` rows behind "See more". Default true. */
  collapsible?: boolean;
  /**
   * Which rows the server returns — `{ includePending: true }` to include
   * invoices that are not yet due. Each distinct query is its own list with
   * its own paging, and the hook keys by value, so an inline object is fine.
   */
  query?: InvoiceQuery;
}

type InvoiceColumn = "date" | "amount";

/** Capped by `limit` below, so the skeleton never promises more than the
 * collapsed card can render. */
const SKELETON_ROWS = 4;

/**
 * The company's invoice history: a heading, a row per invoice with its date
 * linking to the hosted invoice and its amount beside it, and a "See more"
 * toggle past `limit` rows. The same shape and copy as the embed's Invoices
 * component; only the default limit differs.
 */
export function Invoices({
  className,
  collapsible = true,
  headingLevel = 2,
  limit = 10,
  locale: localeProp,
  query,
  showAmount = true,
  showDate = true,
  showHeader = true,
  strings,
}: InvoicesProps) {
  const {
    data: page,
    error,
    isPending,
    loadMore,
    refetch,
  } = useInvoices(query);
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);
  const [expanded, setExpanded] = useState(false);

  const list = useMemo(
    () =>
      page === undefined ? undefined : deriveInvoiceList(page, { locale }),
    [locale, page],
  );

  // The heading is a sibling, so nothing associates the two on its own and
  // a card without a header would announce as a list of no stated subject.
  const headingId = useId();
  const rows = list?.rows ?? [];
  const canCollapse = collapsible && rows.length > limit;
  const showingAll = !canCollapse || expanded;
  const visible = showingAll ? rows : rows.slice(0, limit);
  const Heading = `h${headingLevel}` as const;

  const columns = ([] as InvoiceColumn[]).concat(
    showDate ? "date" : [],
    showAmount ? "amount" : [],
  );

  // A 404 with nothing on screen is the account not being on the flag that
  // serves company reads, and the card says so. Under rows already loaded
  // it reads as any other failed page: "not available" beneath a list of
  // invoices would contradict itself. Retry stays either way — the same
  // status also answers a company the token cannot resolve, which a fresh
  // token fixes, and a card with no way back is worse than a repeat.
  const unavailable = list === undefined && httpStatus(error) === 404;
  // Resolved only for a failure: the translator reports a key it cannot
  // answer, and a healthy card has no business asking for error copy.
  const errorMessage =
    error === undefined
      ? undefined
      : unavailable
        ? t("invoicesUnavailable")
        : t("invoicesError");

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-invoices", className)}
      error={error}
      errorMessage={errorMessage}
      hasData={list !== undefined}
      isPending={isPending}
      loadingLabel={t("invoicesLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={
        <InvoicesSkeleton
          columns={columns}
          rows={Math.max(1, Math.min(limit, SKELETON_ROWS))}
          showHeader={showHeader}
        />
      }
    >
      {list !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <Heading className="schematic-header__title" id={headingId}>
                {t("invoicesHeader")}
              </Heading>
            </div>
          )}
          {rows.length === 0 ? (
            <p className="schematic-muted schematic-invoices__empty">
              {t("invoicesEmpty")}
            </p>
          ) : (
            <ul
              className="schematic-invoices__list"
              aria-label={showHeader ? undefined : t("invoicesHeader")}
              aria-labelledby={showHeader ? headingId : undefined}
            >
              {visible.map((row) => (
                <li
                  className="schematic-invoices__row"
                  key={row.id}
                  data-testid="schematic-invoice"
                >
                  {showDate && (
                    <span className="schematic-invoices__date">
                      <InvoiceDate row={row} t={t} />
                    </span>
                  )}
                  {showAmount && (
                    <span
                      className={cx(
                        "schematic-invoices__amount",
                        row.isCredit && "schematic-invoices__credit",
                      )}
                      // What the embed's tooltip says on hover: whether this
                      // row charged the company or returned money to it.
                      title={
                        row.isCredit
                          ? t("invoicesCreditTooltip")
                          : t("invoicesChargeTooltip")
                      }
                    >
                      {row.isCredit ? `(${row.amountText})` : row.amountText}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
          {(canCollapse || (showingAll && list.hasMore)) && (
            <div className="schematic-invoices__actions">
              {canCollapse && (
                <button
                  aria-expanded={expanded}
                  className="schematic-link-button schematic-invoices__see-more"
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                >
                  <span
                    aria-hidden="true"
                    className="schematic-invoices__chevron"
                  />
                  {expanded ? t("invoicesSeeLess") : t("invoicesSeeMore")}
                </button>
              )}
              {showingAll && list.hasMore && (
                <button
                  className="schematic-link-button schematic-invoices__load-more"
                  disabled={isPending}
                  type="button"
                  // The next page can take the list past `limit`, and a list
                  // that collapsed would remove the control just used.
                  onClick={() => {
                    setExpanded(true);
                    void loadMore();
                  }}
                >
                  {t("invoicesLoadMore")}
                </button>
              )}
            </div>
          )}
        </>
      )}
    </StatusFrame>
  );
}

/**
 * The pending card, shaped like the loaded one: a bar where the heading goes
 * and a bar per column on each row, so the placeholder and the list it
 * becomes occupy the same space rather than the load reflowing the page.
 *
 * The bars carry no text. The frame around them carries the "Loading
 * invoices" label, as text rather than as a live region.
 */
function InvoicesSkeleton({
  columns,
  rows,
  showHeader,
}: {
  columns: InvoiceColumn[];
  rows: number;
  showHeader: boolean;
}) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      {Array.from({ length: rows }, (_, row) => (
        <div className="schematic-skeleton__row" key={row}>
          {columns.map((column) => (
            <div
              className="schematic-skeleton__cell"
              data-column={column}
              key={column}
            />
          ))}
        </div>
      ))}
    </div>
  );
}

function InvoiceDate({ row, t }: { row: InvoiceRow; t: Translator }) {
  if (row.url === null) {
    return (
      <span className="schematic-invoices__date-text">{row.dateText}</span>
    );
  }
  // A link needs a name. A row with no date text has none — its dates were
  // unusable, or a host's own formatter returned nothing for them — and
  // dropping the link would put the hosted invoice out of reach over a
  // formatting problem, so the link says what it leads to instead.
  const label = row.dateText === "" ? t("invoicesUndated") : row.dateText;
  return (
    <a
      className="schematic-invoices__link"
      href={row.url}
      rel="noreferrer"
      target="_blank"
    >
      {label}
    </a>
  );
}

export default Invoices;
