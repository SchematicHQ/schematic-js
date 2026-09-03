import {
  useInvoices,
  type InvoiceQuery,
  type InvoiceStatus,
} from "@schematichq/schematic-react";
import { useMemo, useState } from "react";

import { deriveInvoiceList, plural, type InvoiceRow } from "../model";
import type { StringKey, Translator } from "../strings";

import {
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";

export interface InvoicesProps extends ElementProps {
  /** Rows shown before "See more". Default 10. */
  limit?: number;
  /** The "Invoices" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /** The date column. Default true. */
  showDate?: boolean;
  /** The amount column. Default true. */
  showAmount?: boolean;
  /** The status column. Default false. */
  showStatus?: boolean;
  /** Collapse to `limit` rows behind "See more". Default true. */
  collapsible?: boolean;
  /**
   * Which rows the server returns — `{ includePending: true }` to include
   * invoices that are not yet due. Each distinct query is its own list with
   * its own paging, and the hook keys by value, so an inline object is fine.
   */
  query?: InvoiceQuery;
}

/** A column of the table, and of the skeleton that stands in for it. */
type InvoiceColumn = "date" | "amount" | "status";

/**
 * Rows the pending card shows. Capped by `limit` so the skeleton never
 * promises more rows than the collapsed card can render, and never fewer
 * than one — a placeholder for a list has to look like a list.
 */
const SKELETON_ROWS = 4;

/**
 * The key that labels each status chip. The wire type is a bare string cast,
 * so a status the API adds arrives here with no entry — `statusLabel` shows
 * the raw value rather than an empty chip.
 */
const STATUS_KEY: Record<InvoiceStatus, StringKey> = {
  draft: "invoiceStatusDraft",
  open: "invoiceStatusOpen",
  paid: "invoiceStatusPaid",
  uncollectible: "invoiceStatusUncollectible",
  void: "invoiceStatusVoid",
};

/**
 * The company's invoice history as a table: a dated link to each hosted
 * invoice, its amount (credit notes in parentheses), and optionally its
 * status. Collapses to `limit` rows and pages further history on demand.
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
  showStatus = false,
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

  const rows = list?.rows ?? [];
  const canCollapse = collapsible && rows.length > limit;
  const showingAll = !canCollapse || expanded;
  const visible = showingAll ? rows : rows.slice(0, limit);
  const Heading = `h${headingLevel}` as const;

  const columns = ([] as InvoiceColumn[]).concat(
    showDate ? "date" : [],
    showAmount ? "amount" : [],
    showStatus ? "status" : [],
  );

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-invoices", className)}
      error={error}
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
              <Heading className="schematic-header__title">
                {t("invoicesHeader")}
              </Heading>
              {rows.length > 0 && (
                <span className="schematic-small schematic-muted schematic-invoices__count">
                  {rows.length}{" "}
                  {plural(locale, rows.length, {
                    one: "invoice",
                    other: "invoices",
                  })}
                </span>
              )}
            </div>
          )}
          {rows.length === 0 ? (
            <p className="schematic-muted schematic-invoices__empty">
              {t("invoicesEmpty")}
            </p>
          ) : (
            <table className="schematic-invoices__table">
              <thead className="schematic-invoices__head">
                <tr className="schematic-invoices__head-row">
                  {showDate && (
                    <th
                      className="schematic-invoices__column schematic-invoices__date"
                      scope="col"
                    >
                      {t("invoicesDateColumn")}
                    </th>
                  )}
                  {showAmount && (
                    <th
                      className="schematic-invoices__column schematic-invoices__amount"
                      scope="col"
                    >
                      {t("invoicesAmountColumn")}
                    </th>
                  )}
                  {showStatus && (
                    <th
                      className="schematic-invoices__column schematic-invoices__status"
                      scope="col"
                    >
                      {t("invoicesStatusColumn")}
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="schematic-invoices__body">
                {visible.map((row) => (
                  <tr
                    className="schematic-invoices__row"
                    key={row.id}
                    data-testid="schematic-invoice"
                  >
                    {showDate && (
                      <td className="schematic-invoices__cell schematic-invoices__date">
                        <InvoiceDate row={row} />
                      </td>
                    )}
                    {showAmount && (
                      <td className="schematic-invoices__cell schematic-invoices__amount">
                        {row.isCredit ? (
                          <span
                            className="schematic-invoices__credit"
                            title={t("invoicesCredit")}
                          >
                            ({row.amountText})
                          </span>
                        ) : (
                          row.amountText
                        )}
                      </td>
                    )}
                    {showStatus && (
                      <td className="schematic-invoices__cell schematic-invoices__status">
                        {row.status !== null && (
                          <span
                            className="schematic-chip schematic-invoices__chip"
                            data-status={row.status}
                          >
                            {statusLabel(row.status, t)}
                          </span>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {(canCollapse || (showingAll && list.hasMore)) && (
            <div className="schematic-invoices__actions">
              {canCollapse && (
                <button
                  className="schematic-link-button schematic-invoices__see-more"
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? t("invoicesSeeLess") : t("invoicesSeeMore")}
                </button>
              )}
              {showingAll && list.hasMore && (
                <button
                  className="schematic-link-button schematic-invoices__load-more"
                  disabled={isPending}
                  type="button"
                  // Expanding with it: the next page can take the list past
                  // `limit`, and a list that collapsed on its own would take
                  // away the control that was just used.
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
 * and a bar per column on each row, so the placeholder and the table it
 * becomes occupy the same columns rather than the load reflowing the page.
 *
 * The bars carry no text. What is announced is the frame around them, which
 * owns the `role="status"` and the "Loading invoices" label.
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

/** The chip's text: translated when the status is one we know, raw if not. */
function statusLabel(status: InvoiceStatus, t: Translator): string {
  const key = STATUS_KEY[status] as StringKey | undefined;
  return key === undefined ? status : t(key);
}

function InvoiceDate({ row }: { row: InvoiceRow }) {
  if (row.url === null) {
    return (
      <span className="schematic-invoices__date-text">{row.dateText}</span>
    );
  }
  return (
    <a
      className="schematic-invoices__link"
      href={row.url}
      rel="noreferrer"
      target="_blank"
    >
      {row.dateText}
    </a>
  );
}

export default Invoices;
