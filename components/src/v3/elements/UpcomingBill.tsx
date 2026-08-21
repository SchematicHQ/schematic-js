import { useMemo } from "react";

import { useCompany, useUpcomingInvoice } from "../data";
import {
  deriveContractEnd,
  deriveUpcomingInvoice,
  resolveLocale,
  type DiscountLine,
} from "../model";

import { StatusFrame, cx, type ElementProps } from "./common";

export interface UpcomingBillProps extends ElementProps {
  /** The "Next bill due …" heading. Default true. */
  showHeader?: boolean;
  /** Heading copy before the due date. Default "Next bill due". */
  headerPrefix?: string;
  /** The estimated amount. Default true. */
  showAmount?: boolean;
  /** Discount rows. Default true. */
  showDiscounts?: boolean;
  /** Applied / remaining customer-balance rows. Default true. */
  showBalance?: boolean;
  /** "Contract ends …" when the subscription is scheduled to end. Default true. */
  showContractEnd?: boolean;
  /** Copy before the contract end date. Default "Contract ends". */
  contractEndPrefix?: string;
}

/**
 * The company's next bill: the estimated amount and due date, the balance
 * and discounts that shaped it, and the contract end when the subscription
 * is scheduled to stop.
 */
export function UpcomingBill({
  className,
  contractEndPrefix = "Contract ends",
  headerPrefix = "Next bill due",
  locale: localeProp,
  showAmount = true,
  showBalance = true,
  showContractEnd = true,
  showDiscounts = true,
  showHeader = true,
}: UpcomingBillProps) {
  const { data: invoice, error, isPending, refetch } = useUpcomingInvoice();
  // The company supplies the subscription (period, contract end); the
  // element renders the invoice alone while it is still loading.
  const { data: company } = useCompany();
  const locale = resolveLocale(localeProp);
  const subscription = company?.subscription ?? null;

  const summary = useMemo(
    () =>
      invoice === undefined || invoice === null
        ? null
        : deriveUpcomingInvoice(invoice, subscription, { locale }),
    [invoice, locale, subscription],
  );
  const contractEnd = useMemo(
    () => deriveContractEnd(subscription, { locale }),
    [locale, subscription],
  );

  // `null` means there is nothing to invoice; so does a loaded company
  // without a subscription.
  const isEmpty =
    invoice === null || (company !== undefined && subscription === null);

  return (
    <StatusFrame
      className={cx("schematic-upcoming-bill", className)}
      error={error}
      hasData={invoice !== undefined}
      isPending={isPending}
      label="upcoming bill"
      onRetry={refetch}
    >
      {invoice !== undefined && (isEmpty || summary === null) && (
        <>
          <p className="schematic-muted schematic-upcoming-bill__empty">
            No upcoming invoice
          </p>
          {showContractEnd && contractEnd !== null && (
            <p
              className="schematic-upcoming-bill__contract-end"
              data-testid="sch-contract-end"
            >
              {contractEndPrefix} {contractEnd.text}
            </p>
          )}
        </>
      )}
      {!isEmpty && summary !== null && (
        <>
          {showHeader && (
            <div className="schematic-header">
              <h2>
                {summary.dueAt === null
                  ? headerPrefix
                  : `${headerPrefix} ${summary.dueAt.text}`}
              </h2>
            </div>
          )}
          {showAmount && (
            <div className="schematic-upcoming-bill__amount">
              <span
                className="schematic-upcoming-bill__total"
                data-testid="sch-upcoming-amount"
              >
                {summary.amountDueText}
              </span>
              <span className="schematic-muted schematic-small">
                Estimated bill
              </span>
            </div>
          )}
          {((showBalance &&
            (summary.balanceApplied !== null ||
              summary.balanceRemaining !== null)) ||
            (showDiscounts && summary.discounts.length > 0)) && (
            <div className="schematic-upcoming-bill__rows">
              {showBalance && summary.balanceApplied !== null && (
                <div
                  className="schematic-row"
                  data-testid="sch-balance-applied"
                >
                  <span>Applied balance towards next invoice</span>
                  <span>-{summary.balanceApplied.text}</span>
                </div>
              )}
              {showBalance && summary.balanceRemaining !== null && (
                <div
                  className="schematic-row"
                  data-testid="sch-balance-remaining"
                >
                  <span>Remaining balance after next invoice</span>
                  <span>{summary.balanceRemaining.text}</span>
                </div>
              )}
              {showDiscounts &&
                summary.discounts.map((discount, index) => (
                  <div
                    key={`${discount.couponName}-${index}`}
                    className="schematic-row"
                    data-testid="sch-discount"
                  >
                    <span>Discount</span>
                    <span className="schematic-upcoming-bill__discount">
                      {discount.code !== null ? (
                        <span className="schematic-chip">{discount.code}</span>
                      ) : (
                        <span className="schematic-muted">
                          {discount.couponName}
                        </span>
                      )}
                      <span>{discountText(discount)}</span>
                    </span>
                  </div>
                ))}
            </div>
          )}
          {showContractEnd && summary.contractEndsAt !== null && (
            <p
              className="schematic-muted schematic-upcoming-bill__contract-end"
              data-testid="sch-contract-end"
            >
              {contractEndPrefix} {summary.contractEndsAt.text}
            </p>
          )}
        </>
      )}
    </StatusFrame>
  );
}

/** "20% off for 3 months" / "$5.00 off". */
function discountText(discount: DiscountLine): string {
  const base = `${discount.valueText} off`;
  if (discount.months === null) {
    return base;
  }
  return `${base} for ${discount.months} ${discount.months === 1 ? "month" : "months"}`;
}

export default UpcomingBill;
