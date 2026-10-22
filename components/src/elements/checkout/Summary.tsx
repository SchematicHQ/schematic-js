import React, { useState } from "react";

import type {
  CheckoutModel,
  CheckoutPeriod,
  CheckoutProration,
  ProrationLine,
  SummaryLine,
} from "../model";
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

const LINE_LABEL: Record<
  ProrationLine["kind"],
  { named: StringKey; unnamed: StringKey }
> = {
  charge: {
    named: "checkoutProrationCharge",
    unnamed: "checkoutProrationChargeUnnamed",
  },
  credit: {
    named: "checkoutProrationCredit",
    unnamed: "checkoutProrationCreditUnnamed",
  },
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
  // What renews, then what is charged once, so the period's total reads
  // against the lines it adds up.
  const recurring = lines.filter((line) => !line.oneTime);
  const oneTime = lines.filter((line) => line.oneTime);
  // Held here rather than in the row: a re-price the server refuses drops
  // the totals, and the row with them, and the customer's choice to see the
  // lines should outlive that.
  const [prorationOpen, setProrationOpen] = useState(false);
  return (
    <aside
      aria-busy={isPricing}
      className="schematic-checkout__summary"
      data-testid="schematic-checkout-summary"
    >
      <h3 className="schematic-checkout__summary-title">
        {t("checkoutSummary")}
      </h3>
      {recurring.length > 0 && <Lines lines={recurring} />}
      {oneTime.length > 0 && (
        <>
          {recurring.length > 0 && (
            <p className="schematic-checkout__lines-caption">
              {t("checkoutOneTime")}
            </p>
          )}
          <Lines lines={oneTime} oneTime />
        </>
      )}
      {totals !== null && model.priceable && (
        <ul className="schematic-checkout__totals">
          {totals.proration !== null ? (
            <ProrationRow
              open={prorationOpen}
              proration={totals.proration}
              t={t}
              onToggle={() => setProrationOpen((value) => !value)}
            />
          ) : (
            totals.prorationText !== null && (
              <Total
                label={t("checkoutProration")}
                amount={totals.prorationText}
              />
            )
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
          {totals.creditAppliedText !== null && (
            <Total
              label={t("checkoutCreditApplied")}
              amount={totals.creditAppliedText}
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
      {totals?.proration?.billedAtText != null && (
        <p className="schematic-checkout__disclaimer">
          {t("checkoutProrationBilledAtRenewal", {
            date: totals.proration.billedAtText,
          })}
        </p>
      )}
      {totals?.creditRemainingText != null && (
        <p className="schematic-checkout__disclaimer">
          {t("checkoutCreditRemaining", {
            amount: totals.creditRemainingText,
          })}
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

function Lines({
  lines,
  oneTime = false,
}: {
  lines: SummaryLine[];
  oneTime?: boolean;
}) {
  return (
    <ul
      className={
        oneTime
          ? "schematic-checkout__lines schematic-checkout__lines--one-time"
          : "schematic-checkout__lines"
      }
    >
      {lines.map((line) => (
        <li
          className={
            oneTime
              ? "schematic-checkout__line schematic-checkout__line--one-time"
              : "schematic-checkout__line"
          }
          key={line.key}
        >
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
  );
}

/**
 * The proration itemized: the net on the row, and the credit and charge
 * lines under a toggle, closed until asked for.
 */
function ProrationRow({
  onToggle,
  open,
  proration,
  t,
}: {
  onToggle: () => void;
  open: boolean;
  proration: CheckoutProration;
  t: Translator;
}) {
  return (
    <li className="schematic-checkout__total schematic-checkout__total--proration">
      <span>
        {t("checkoutProration")}
        <button
          aria-expanded={open}
          className="schematic-link-button schematic-checkout__proration-toggle"
          type="button"
          onClick={onToggle}
        >
          <i
            aria-hidden="true"
            className={`schematic-icon schematic-icon--${open ? "chevron-up" : "chevron-down"} schematic-chevron`}
          />
          <span className="schematic-link-button__label">
            {open
              ? t("checkoutProrationHideDetails")
              : t("checkoutProrationShowDetails")}
          </span>
        </button>
      </span>
      <span className="schematic-checkout__total-amount">
        {proration.totalText}
      </span>
      {open && (
        <ul className="schematic-checkout__proration">
          {proration.lines.map((line) => (
            <li className="schematic-checkout__proration-line" key={line.key}>
              <span>
                {t(
                  line.name === null
                    ? LINE_LABEL[line.kind].unnamed
                    : LINE_LABEL[line.kind].named,
                  { name: line.name ?? "" },
                )}
                {line.periodText !== null && (
                  <span className="schematic-checkout__proration-period">
                    {line.periodText}
                  </span>
                )}
              </span>
              <span className="schematic-checkout__line-amount">
                {line.amountText}
              </span>
            </li>
          ))}
        </ul>
      )}
    </li>
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
