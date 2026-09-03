import { useUpcomingInvoice } from "@schematichq/schematic-react";
import { useMemo } from "react";

import { deriveUpcomingInvoice, type DiscountLine } from "../model";
import type { Translator } from "../strings";

import {
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";

export interface UpcomingBillProps extends ElementProps {
  /** The "Next bill due …" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /** The estimated amount. Default true. */
  showAmount?: boolean;
  /** The applied and remaining account-balance rows. Default true. */
  showBalance?: boolean;
  /** The discount rows. Default true. */
  showDiscounts?: boolean;
}

/**
 * The company's next bill: what it will be charged and when, and the
 * account balance and discounts that shaped the figure.
 *
 * A company with nothing to bill — no subscription, or one that is ending —
 * gets the empty state rather than a fabricated zero. That is a loaded
 * answer from the server, not a missing one, so it renders as content
 * rather than as a permanent skeleton.
 */
export function UpcomingBill({
  className,
  headingLevel = 2,
  locale: localeProp,
  showAmount = true,
  showBalance = true,
  showDiscounts = true,
  showHeader = true,
  strings,
}: UpcomingBillProps) {
  const { data: invoice, error, isPending, refetch } = useUpcomingInvoice();
  const locale = useResolvedLocale(localeProp);
  const t = useTranslator(strings, localeProp);

  const bill = useMemo(
    () =>
      invoice === undefined || invoice === null
        ? null
        : deriveUpcomingInvoice(invoice, { locale }),
    [invoice, locale],
  );

  const Heading = `h${headingLevel}` as const;
  const balanceRows =
    showBalance &&
    bill !== null &&
    (bill.balanceApplied !== null || bill.balanceRemaining !== null);
  const discountRows =
    showDiscounts && bill !== null && bill.discounts.length > 0;

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-upcoming-bill", className)}
      error={error}
      hasData={invoice !== undefined}
      isPending={isPending}
      loadingLabel={t("upcomingBillLoading")}
      onRetry={refetch}
      retryText={t("retry")}
      skeleton={<UpcomingBillSkeleton showHeader={showHeader} />}
    >
      {bill === null ? (
        invoice !== undefined && (
          <p className="schematic-muted schematic-upcoming-bill__empty">
            {t("upcomingBillEmpty")}
          </p>
        )
      ) : (
        <>
          {showHeader && (
            <div className="schematic-header">
              <Heading className="schematic-header__title">
                {bill.dueAt === null
                  ? t("upcomingBillHeaderUndated")
                  : t("upcomingBillHeader", { date: bill.dueAt.text })}
              </Heading>
            </div>
          )}
          {showAmount && (
            <div className="schematic-upcoming-bill__amount">
              <span
                className="schematic-upcoming-bill__total"
                data-testid="schematic-upcoming-total"
              >
                {bill.amountDueText}
              </span>
              <span className="schematic-muted schematic-small schematic-upcoming-bill__estimate">
                {t("upcomingBillEstimate")}
              </span>
            </div>
          )}
          {(balanceRows || discountRows) && (
            <div className="schematic-upcoming-bill__rows">
              {balanceRows && bill.balanceApplied !== null && (
                <div
                  className="schematic-row schematic-upcoming-bill__balance-applied"
                  data-testid="schematic-balance-applied"
                >
                  <span className="schematic-row__label">
                    {t("upcomingBillBalanceApplied")}
                  </span>
                  <span className="schematic-row__value">
                    {bill.balanceApplied.amountText}
                  </span>
                </div>
              )}
              {balanceRows && bill.balanceRemaining !== null && (
                <div
                  className="schematic-row schematic-upcoming-bill__balance-remaining"
                  data-testid="schematic-balance-remaining"
                >
                  <span className="schematic-row__label">
                    {t("upcomingBillBalanceRemaining")}
                  </span>
                  <span className="schematic-row__value">
                    {bill.balanceRemaining.amountText}
                  </span>
                </div>
              )}
              {discountRows &&
                bill.discounts.map((discount, index) => (
                  <div
                    className="schematic-row schematic-upcoming-bill__discount-row"
                    data-testid="schematic-discount"
                    // A company can hold two coupons with one name, and a
                    // promo code is optional, so neither is a key on its own.
                    key={`${discount.couponName}-${index}`}
                  >
                    <span className="schematic-row__label">
                      {t("upcomingBillDiscount")}
                    </span>
                    <span className="schematic-row__value schematic-upcoming-bill__discount">
                      {discount.code === null ? (
                        <span className="schematic-muted schematic-upcoming-bill__coupon">
                          {discount.couponName}
                        </span>
                      ) : (
                        <span className="schematic-chip schematic-upcoming-bill__code">
                          {discount.code}
                        </span>
                      )}
                      <span className="schematic-upcoming-bill__discount-value">
                        {discountText(discount, t)}
                      </span>
                    </span>
                  </div>
                ))}
            </div>
          )}
        </>
      )}
    </StatusFrame>
  );
}

/**
 * The pending card, shaped like the loaded one: a heading bar, the amount,
 * and a row beneath it, so the load does not resolve from a blank block
 * into a card of a different height.
 */
function UpcomingBillSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      <div className="schematic-skeleton__row">
        <div
          className="schematic-skeleton__cell"
          data-column="amount"
          data-testid="schematic-skeleton-amount"
        />
      </div>
      <div className="schematic-skeleton__row">
        <div className="schematic-skeleton__cell" data-column="row" />
      </div>
    </div>
  );
}

/** "20% off", or "20% off for 3 months" while it repeats. */
function discountText(discount: DiscountLine, t: Translator): string {
  if (discount.months === null) {
    return t("upcomingBillDiscountValue", { value: discount.valueText });
  }
  return t("upcomingBillDiscountRepeating", {
    count: discount.months,
    value: discount.valueText,
  });
}

export default UpcomingBill;
