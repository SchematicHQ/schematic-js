import React from "react";

import type { CheckoutModel, CheckoutPeriod } from "../model";
import type { StringKey, Translator } from "../strings";

const TOTAL_PER: Record<CheckoutPeriod, StringKey> = {
  month: "checkoutTotalPerMonth",
  quarter: "checkoutTotalPerQuarter",
  year: "checkoutTotalPerYear",
};

const DISCLAIMER: Record<CheckoutPeriod, StringKey> = {
  month: "checkoutDisclaimerMonth",
  quarter: "checkoutDisclaimerQuarter",
  year: "checkoutDisclaimerYear",
};

/**
 * What the cart holds, what it costs now and each period, and the action
 * that moves on or charges. The totals are the server's last price; while a
 * newer cart is being priced they stay up, marked as updating.
 */
export function Summary({
  action,
  isPricing,
  model,
  pricingError,
  showDisclaimer,
  t,
}: {
  action: React.ReactNode;
  isPricing: boolean;
  model: CheckoutModel;
  pricingError: boolean;
  showDisclaimer: boolean;
  t: Translator;
}) {
  const { lines, totals } = model;
  const period = model.period.value;
  return (
    <aside
      aria-busy={isPricing}
      className="schematic-checkout__summary"
      data-testid="schematic-checkout-summary"
    >
      <h3 className="schematic-checkout__summary-title">
        {t("checkoutSummary")}
      </h3>
      {lines.length > 0 && (
        <ul className="schematic-checkout__lines">
          {lines.map((line) => (
            <li className="schematic-checkout__line" key={line.key}>
              <span>
                {line.quantity !== null && `${line.quantity} × `}
                {line.label}
              </span>
              <span className="schematic-checkout__line-amount">
                {line.amountText}
              </span>
            </li>
          ))}
        </ul>
      )}
      {totals !== null && model.priceable && (
        <ul className="schematic-checkout__totals">
          {totals.prorationText !== null && (
            <Total
              label={t("checkoutProration")}
              amount={totals.prorationText}
            />
          )}
          {totals.discountText !== null && (
            <Total label={t("checkoutDiscount")} amount={totals.discountText} />
          )}
          {totals.taxText !== null && (
            <Total label={t("checkoutTax")} amount={totals.taxText} />
          )}
          {totals.totalPerPeriodText !== null && (
            <Total
              label={t(TOTAL_PER[period])}
              amount={totals.totalPerPeriodText}
            />
          )}
          <Total amount={totals.dueNowText} due label={t("checkoutDueToday")} />
        </ul>
      )}
      {isPricing && (
        <p className="schematic-muted schematic-small" role="status">
          {t("checkoutPricing")}
        </p>
      )}
      {pricingError && !isPricing && (
        <p className="schematic-error schematic-small" role="alert">
          {t("checkoutPricingError")}
        </p>
      )}
      {totals?.trialEndText != null && (
        <p className="schematic-checkout__disclaimer">
          {t("checkoutTrialEnds", { date: totals.trialEndText })}
        </p>
      )}
      {totals?.scheduledChangeText != null && (
        <p className="schematic-checkout__disclaimer">
          {t("checkoutScheduledChange", { date: totals.scheduledChangeText })}
        </p>
      )}
      {showDisclaimer && totals?.totalPerPeriodText != null && (
        <p className="schematic-checkout__disclaimer">
          {t(DISCLAIMER[period])}
        </p>
      )}
      {action}
    </aside>
  );
}

function Total({
  amount,
  due = false,
  label,
}: {
  amount: string;
  due?: boolean;
  label: string;
}) {
  return (
    <li
      className={
        due
          ? "schematic-checkout__total schematic-checkout__total--due"
          : "schematic-checkout__total"
      }
    >
      <span>{label}</span>
      <span className="schematic-checkout__total-amount">{amount}</span>
    </li>
  );
}
