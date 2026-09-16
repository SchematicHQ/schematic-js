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
   * Server-side filter, e.g. `{ includePending: true }` for invoices not yet
   * due. The hook keys by value, so an inline object is fine.
   */
  query?: InvoiceQuery;
}

type InvoiceColumn = "date" | "amount";

/** Skeleton rows, further capped by `limit` at the call site. */
const SKELETON_ROWS = 4;

/**
 * The company's invoice history. Each row links its date to the hosted
 * invoice and shows the amount beside it; rows past `limit` sit behind
 * "See more".
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

  // A list has no name of its own, so it is labelled by the heading, or by
  // the same text when the header is hidden.
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

  // A 404 means the account is not enabled for company reads, but "not
  // available" under rows already loaded would contradict itself. Retry stays:
  // the same status answers a token whose company cannot be resolved yet.
  const unavailable = list === undefined && httpStatus(error) === 404;
  // Only resolve error copy on failure, or a host's translator would report
  // a missing key on every healthy render.
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
                  // Expand first: the next page can push the list past
                  // `limit`, and collapsing would hide the button just clicked.
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
 * Mirrors the loaded card's shape so the page does not reflow when the rows
 * arrive. The surrounding frame carries the loading label.
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
  // A row with no usable date still needs a link name, and dropping the
  // link would make the hosted invoice unreachable over a formatting problem.
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
