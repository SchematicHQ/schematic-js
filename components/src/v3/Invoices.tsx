import {
  deriveInvoiceList,
  useInvoices,
  useSchematicLocale,
} from "@schematichq/schematic-react";
import React, { useMemo } from "react";

import { StatusFrame, cx } from "./common";

export interface InvoicesProps {
  className?: string;
  /** Include unpaid invoices whose due date is still in the future. */
  includePending?: boolean;
  /** Rows per page; "Load more" appends another page. Default 10. */
  limit?: number;
  /** BCP 47 locale for formatting; the provider's locale, then the browser's, if omitted. */
  locale?: string;
}

/**
 * The company's invoice history — filtering (zero-amount, drafts, synthetic
 * upcoming rows) and ordering happen server-side. Requires an access token.
 */
export const Invoices: React.FC<InvoicesProps> = ({
  className,
  includePending,
  limit,
  locale: localeProp,
}) => {
  const params = useMemo(
    () => ({
      ...(includePending !== undefined ? { includePending } : {}),
      ...(limit !== undefined ? { limit } : {}),
    }),
    [includePending, limit],
  );
  const { data, error, fetchMore, hasMore, isPending, isRefetching, refetch } =
    useInvoices(params);
  const providerLocale = useSchematicLocale();
  const locale = localeProp ?? providerLocale;
  const rows = useMemo(
    () => (data !== undefined ? deriveInvoiceList(data.rows, { locale }) : []),
    [data, locale],
  );

  return (
    <StatusFrame
      className={cx("schematic-invoices", className)}
      error={error}
      hasData={data !== undefined}
      isPending={isPending}
      onRetry={() => void refetch()}
    >
      {rows.length === 0 ? (
        <span className="schematic-muted">No invoices</span>
      ) : (
        <>
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.id}>
                  <td>
                    {row.url !== undefined ? (
                      <a href={row.url} rel="noreferrer" target="_blank">
                        {row.formattedDate}
                      </a>
                    ) : (
                      row.formattedDate
                    )}
                  </td>
                  <td>{row.formattedAmount}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {hasMore && (
            <button
              className="schematic-link-button"
              disabled={isRefetching}
              type="button"
              onClick={() => void fetchMore()}
            >
              {isRefetching ? "Loading…" : "Load more"}
            </button>
          )}
        </>
      )}
    </StatusFrame>
  );
};
