import {
  deriveUpcomingInvoice,
  useSchematicLocale,
  useUpcomingInvoice,
} from "@schematichq/schematic-react";
import React, { useMemo } from "react";

import { StatusFrame, cx } from "./common";

export interface UpcomingBillProps {
  className?: string;
  /** BCP 47 locale for formatting; the provider's locale, then the browser's, if omitted. */
  locale?: string;
}

/**
 * The company's next bill: subtotal, active discounts, applied customer
 * balance, and the amount due — all math precomputed server-side. Requires
 * an access token.
 */
export const UpcomingBill: React.FC<UpcomingBillProps> = ({
  className,
  locale: localeProp,
}) => {
  const { data, error, isPending, refetch } = useUpcomingInvoice();
  const providerLocale = useSchematicLocale();
  const locale = localeProp ?? providerLocale;
  // data is null when there is nothing upcoming (no subscription) — an
  // empty state, not an error.
  const vm = useMemo(
    () => (data != null ? deriveUpcomingInvoice(data, { locale }) : undefined),
    [data, locale],
  );

  return (
    <StatusFrame
      className={cx("schematic-upcoming-bill", className)}
      error={error}
      hasData={data !== undefined}
      isPending={isPending}
      onRetry={() => void refetch()}
    >
      {data === null && <p className="schematic-muted">No upcoming bill.</p>}
      {vm !== undefined && (
        <>
          {vm.formattedDueDate !== undefined && (
            <p className="schematic-muted">Due {vm.formattedDueDate}</p>
          )}
          <div className="schematic-row">
            <span>Subtotal</span>
            <span>{vm.formattedSubtotal}</span>
          </div>
          {vm.discounts.map((discount, index) => (
            <div
              className="schematic-row"
              key={`${discount.customerFacingCode ?? discount.couponName}:${index}`}
            >
              <span>
                {discount.couponName}
                {discount.durationInMonths !== undefined &&
                  ` (${discount.durationInMonths} months)`}
              </span>
              <span>
                {discount.percentOff !== undefined
                  ? `−${discount.percentOff}%`
                  : discount.formattedAmountOff !== undefined
                    ? `−${discount.formattedAmountOff}`
                    : ""}
              </span>
            </div>
          ))}
          {vm.formattedBalanceApplied !== undefined && (
            <div className="schematic-row">
              <span>Credit balance applied</span>
              <span>−{vm.formattedBalanceApplied}</span>
            </div>
          )}
          <div className="schematic-row">
            <strong>Amount due</strong>
            <strong>{vm.formattedAmountDue}</strong>
          </div>
          {vm.formattedBalanceRemaining !== undefined && (
            <p className="schematic-muted">
              {vm.formattedBalanceRemaining} credit remains after this bill
            </p>
          )}
        </>
      )}
    </StatusFrame>
  );
};
