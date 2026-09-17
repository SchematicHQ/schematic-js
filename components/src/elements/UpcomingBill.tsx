import { useUpcomingInvoice } from "@schematichq/schematic-react";
import { useMemo } from "react";

import {
  StatusFrame,
  cx,
  useResolvedLocale,
  useTranslator,
  type ElementProps,
  type HeadingLevel,
} from "./common";
import { deriveUpcomingInvoice, type DiscountLine } from "./model";
import type { Translator } from "./strings";

export interface UpcomingBillProps extends ElementProps {
  /** The "Next bill due …" heading. Default true. */
  showHeader?: boolean;
  /** Heading level, so the card fits the host's outline. Default 2. */
  headingLevel?: HeadingLevel;
  /** The estimated amount. Default true. */
  showAmount?: boolean;
  /** The applied and remaining account-balance rows. Default true. */
  showBalance?: boolean;
  /** The discount row. Default true. */
  showDiscounts?: boolean;
}

/**
 * The company's next bill: what it will be charged and when, and the
 * account balance and discounts that shaped the figure.
 *
 * A company with nothing to bill — no subscription — gets the empty state
 * rather than a fabricated zero. That is a loaded answer from the server,
 * not a missing one, so it renders as content rather than as a permanent
 * skeleton.
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
  const discountRow =
    showDiscounts && bill !== null && bill.discounts.length > 0;

  return (
    <StatusFrame
      className={cx("schematic-card", "schematic-upcoming-bill", className)}
      error={error}
      // Only resolve error copy on failure, or a host's translator would
      // report a missing key on every healthy render.
      errorMessage={error === undefined ? undefined : t("upcomingBillError")}
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
          {/* A bill the provider has not dated has no heading to give it. */}
          {showHeader && bill.dueAt !== null && (
            <div className="schematic-header">
              <Heading className="schematic-header__title">
                {t("upcomingBillHeader", { date: bill.dueAt.text })}
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
              <span className="schematic-small schematic-upcoming-bill__estimate">
                {t("upcomingBillEstimate")}
              </span>
            </div>
          )}
          {(balanceRows || discountRow) && (
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
              {discountRow && (
                <div
                  className="schematic-row schematic-upcoming-bill__discount-row"
                  data-testid="schematic-discounts"
                >
                  <span className="schematic-row__label">
                    {t("upcomingBillDiscount")}
                  </span>
                  <ul className="schematic-row__value schematic-upcoming-bill__discounts">
                    {bill.discounts.map((discount, index) => (
                      <li
                        className="schematic-upcoming-bill__discount"
                        data-testid="schematic-discount"
                        // A company can hold two coupons with one name, and
                        // a promo code is optional, so neither is a key on
                        // its own.
                        key={`${discount.couponName}-${index}`}
                      >
                        {discount.code !== null && (
                          <span className="schematic-chip schematic-upcoming-bill__code">
                            {discount.code}
                          </span>
                        )}
                        <span className="schematic-upcoming-bill__discount-value">
                          {discountText(discount, t)}
                        </span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </StatusFrame>
  );
}

/**
 * Mirrors the loaded card's shape — a heading bar, the amount, and a row
 * beneath it — so the load does not resolve from a blank block into a card
 * of a different height. The surrounding frame carries the loading label.
 */
function UpcomingBillSkeleton({ showHeader }: { showHeader: boolean }) {
  return (
    <div className="schematic-skeleton">
      {showHeader && <div className="schematic-skeleton__heading" />}
      <div className="schematic-skeleton__row">
        <div className="schematic-skeleton__cell" data-column="amount" />
      </div>
      <div className="schematic-skeleton__row">
        <div className="schematic-skeleton__cell" data-column="row" />
      </div>
    </div>
  );
}

/** "20% off", or "20% off for next 3 months" while it repeats. */
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
