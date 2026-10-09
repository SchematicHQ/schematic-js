import type { CheckoutProblem } from "@schematichq/schematic-react";

import type { CheckoutPeriod, CheckoutStep } from "../model";
import type { StringKey, Translator } from "../strings";

/** The words a problem is shown in: the host's, else the server's. */
export type ProblemFormatter = (problem: CheckoutProblem) => string | undefined;

const STEP_KEY: Record<CheckoutStep, StringKey> = {
  plan: "checkoutStepPlan",
  autoTopup: "checkoutStepAutoTopup",
  usage: "checkoutStepUsage",
  addOns: "checkoutStepAddOns",
  addOnUsage: "checkoutStepAddOnUsage",
  credits: "checkoutStepCredits",
  payment: "checkoutStepPayment",
};

export const stepLabel = (step: CheckoutStep, t: Translator): string =>
  t(STEP_KEY[step]);

const PER: Record<CheckoutPeriod, StringKey> = {
  month: "checkoutPerMonth",
  quarter: "checkoutPerQuarter",
  year: "checkoutPerYear",
};

/** "/month" after a recurring price. */
export const perPeriod = (period: CheckoutPeriod, t: Translator): string =>
  t(PER[period]);

const PERIOD_NAME: Record<CheckoutPeriod, StringKey> = {
  month: "checkoutPeriodMonth",
  quarter: "checkoutPeriodQuarter",
  year: "checkoutPeriodYear",
};

export const periodName = (period: CheckoutPeriod, t: Translator): string =>
  t(PERIOD_NAME[period]);

/**
 * The problems a step or the checkout has, most urgent first. A blocking one
 * is an alert; the rest are advisories.
 */
export function ProblemList({
  format,
  problems,
}: {
  format?: ProblemFormatter;
  problems: readonly CheckoutProblem[] | undefined;
}) {
  if (problems === undefined || problems.length === 0) {
    return null;
  }
  const ordered = [...problems].sort(
    (a, b) => Number(b.blocking) - Number(a.blocking),
  );
  return (
    <ul className="schematic-checkout__problems">
      {ordered.map((problem, index) => (
        <li
          className={
            problem.blocking
              ? "schematic-notice schematic-notice--danger"
              : "schematic-notice schematic-notice--warning"
          }
          data-code={problem.code}
          key={`${problem.code}:${index}`}
          role={problem.blocking ? "alert" : undefined}
        >
          {format?.(problem) ?? problem.message}
        </li>
      ))}
    </ul>
  );
}

/** A price with its period after it. */
export function Price({
  period,
  recurring,
  text,
  t,
}: {
  period: CheckoutPeriod;
  recurring: boolean;
  text: string;
  t: Translator;
}) {
  return (
    <span className="schematic-checkout__card-price">
      {text}
      {recurring && (
        <sub className="schematic-checkout__card-period">
          {perPeriod(period, t)}
        </sub>
      )}
    </span>
  );
}
