import { useInvoices } from "@schematichq/schematic-react";
import { useMemo, useState } from "react";

import { deriveInvoiceList, resolveLocale, type InvoiceRow } from "../model";

import { StatusFrame, cx, type ElementProps } from "./common";

export interface InvoicesProps extends ElementProps {
  /** Rows shown before "See more". Default 2. */
  limit?: number;
  /** The "Invoices" heading. Default true. */
  showHeader?: boolean;
  /** Heading copy. Default "Invoices". */
  headerText?: string;
  /** The date column. Default true. */
  showDate?: boolean;
  /** The amount column. Default true. */
  showAmount?: boolean;
  /** The status column. Default false. */
  showStatus?: boolean;
  /** Collapse to `limit` rows behind "See more". Default true. */
  collapsible?: boolean;
}

/**
 * The company's invoice history as a table: a dated link to each hosted
 * invoice, its amount (credit notes in parentheses), and optionally its
 * status. Collapses to `limit` rows and pages further history on demand.
 */
export function Invoices({
  className,
  collapsible = true,
  headerText = "Invoices",
  limit = 2,
  locale: localeProp,
  showAmount = true,
  showDate = true,
  showHeader = true,
  showStatus = false,
}: InvoicesProps) {
  const { data: page, error, isPending, loadMore, refetch } = useInvoices();
  const locale = resolveLocale(localeProp);
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

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-invoices", className)}
      error={error}
      hasData={list !== undefined}
      isPending={isPending}
      label="invoices"
      onRetry={refetch}
    >
      {list !== undefined && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <h2>{headerText}</h2>
            </div>
          )}
          {rows.length === 0 ? (
            <p className="schematic-muted schematic-invoices__empty">
              No invoices yet
            </p>
          ) : (
            <table className="schematic-invoices__table">
              <thead className="schematic-visually-hidden">
                <tr>
                  {showDate && <th scope="col">Date</th>}
                  {showAmount && <th scope="col">Amount</th>}
                  {showStatus && <th scope="col">Status</th>}
                </tr>
              </thead>
              <tbody>
                {visible.map((row) => (
                  <tr key={row.id} data-testid="sch-invoice">
                    {showDate && (
                      <td className="schematic-invoices__date">
                        <InvoiceDate row={row} />
                      </td>
                    )}
                    {showAmount && (
                      <td className="schematic-invoices__amount">
                        {row.isCredit ? (
                          <span
                            className="schematic-invoices__credit"
                            title="Credit applied to your account"
                          >
                            ({row.amountText})
                          </span>
                        ) : (
                          row.amountText
                        )}
                      </td>
                    )}
                    {showStatus && (
                      <td className="schematic-invoices__status">
                        {row.status !== null && (
                          <span className="schematic-chip">{row.status}</span>
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
                  className="schematic-link-button"
                  type="button"
                  onClick={() => setExpanded((value) => !value)}
                >
                  {expanded ? "See less" : "See more"}
                </button>
              )}
              {showingAll && list.hasMore && (
                <button
                  className="schematic-link-button"
                  type="button"
                  onClick={loadMore}
                >
                  Load more
                </button>
              )}
            </div>
          )}
        </>
      )}
    </StatusFrame>
  );
}

function InvoiceDate({ row }: { row: InvoiceRow }) {
  if (row.url === null) {
    return <span>{row.dateText}</span>;
  }
  return (
    <a href={row.url} rel="noreferrer" target="_blank">
      {row.dateText}
    </a>
  );
}

export default Invoices;
