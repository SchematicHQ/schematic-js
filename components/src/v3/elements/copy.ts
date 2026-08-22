/**
 * The elements' default English, assembled from the domain models'
 * structured parts. Nothing here is exported from the package: consumers
 * who want other copy use the hooks and derivations and write their own.
 */

import type {
  EntitlementSummary,
  EntitlementValue,
  Notice,
  PlanAction,
  PlanCreditSummary,
  TimeRemaining,
  UnitPrice,
  UsageAllocation,
  UsageSummary,
} from "../model";
import { pluralize } from "../model";

/** "$0.02 per 1,000 API calls" / "$5.00 per seat". */
export function perUnit(price: UnitPrice): string {
  const pkg = price.packageText === null ? "" : `${price.packageText} `;
  return `${price.priceText} per ${pkg}${price.unit}`;
}

/** "$0.02/1,000 API calls/mo" — the compact form. */
export function perUnitShort(price: UnitPrice): string {
  const pkg = price.packageText === null ? "" : `${price.packageText} `;
  const period = price.periodShort === null ? "" : `/${price.periodShort}`;
  return `${price.priceText}/${pkg}${price.unit}${period}`;
}

/** The primary line of a pricing-table entitlement row. */
export function entitlementText(value: EntitlementValue): string {
  switch (value.kind) {
    case "boolean":
    case "trait":
      return value.unit;
    case "numeric":
      return `${value.quantityText} ${value.unit}${value.periodWord === null ? "" : ` per ${value.periodWord}`}`;
    case "unlimited":
      return `Unlimited ${value.unit}`;
    case "priced":
      return value.perPeriod && value.price.period !== null
        ? `${perUnit(value.price)} per ${periodWordOf(value.price)}`
        : perUnit(value.price);
    case "tiered": {
      const { firstTier, unit, periodWord } = value;
      const upTo =
        firstTier.toText === null
          ? `${unit}`
          : `Up to ${firstTier.toText} ${unit}`;
      if (firstTier.flatText === null) {
        return firstTier.unitPriceText === zeroText(firstTier.unitPriceText)
          ? `${upTo} for free`
          : `${upTo} at ${firstTier.unitPriceText} per ${pluralize(unit, 1)}`;
      }
      return `${upTo} for ${firstTier.flatText} per ${periodWord ?? "period"}`;
    }
    case "credit_rate":
      return `${value.rateText} ${value.creditUnit} per ${value.unit}`;
    case "credit_limit":
      return `Up to ${value.quantityText} ${value.unit}${value.periodWord === null ? "" : ` per ${value.periodWord}`}`;
    case "unavailable":
      return value.unit;
  }
}

function periodWordOf(price: UnitPrice): string {
  switch (price.period) {
    case "month":
      return "month";
    case "quarter":
      return "quarter";
    case "year":
      return "year";
    default:
      return "period";
  }
}

/** Whether a formatted amount reads as zero ("$0.00", "€0,00", "¥0"). */
function zeroText(text: string): string {
  return /[1-9]/.test(text) ? "" : text;
}

/** The secondary line of an entitlement row, when any. */
export function entitlementDetail(summary: EntitlementSummary): string | null {
  if (summary.overage !== null) {
    return `then ${perUnitShort(summary.overage)}`;
  }
  if (summary.tiers !== null) {
    return "Tier-based";
  }
  return null;
}

/** "Up to a limit of 1,000 API calls". */
export function hardLimitText(
  limit: number,
  unit: string,
  locale: string,
): string {
  return `Up to a limit of ${new Intl.NumberFormat(locale).format(limit)} ${unit}`;
}

/** Included-credit line on a plan card: "500 AI credits per month". */
export function planCreditText(credit: PlanCreditSummary): string {
  if (credit.perLicense !== null) {
    const license = credit.perLicense.licenseName ?? "license";
    const base = `${credit.perLicense.amountText} ${credit.perLicense.unit} per ${license}`;
    return credit.periodWord === null
      ? base
      : `${base} per ${credit.periodWord}`;
  }
  const base = `${credit.quantityText} ${credit.unit}`;
  return credit.periodWord === null ? base : `${base} per ${credit.periodWord}`;
}

/** Extra flat credits under a per-license line: "+ 100 AI credits per month for your company". */
export function planCreditExtraText(credit: PlanCreditSummary): string | null {
  if (
    credit.perLicense === null ||
    credit.quantity <= 0 ||
    credit.periodWord === null
  ) {
    return null;
  }
  return `+ ${credit.quantityText} ${credit.unit} per ${credit.periodWord} for your company`;
}

/** The label of a plan card's call to action. */
export function planActionLabel(
  action: PlanAction,
  options: { isAddOn: boolean; customLabel?: string | null },
): string {
  if (action.kind === "custom") {
    return options.customLabel ?? "Talk to support";
  }
  if (action.downgradeBlocked !== null) {
    return action.downgradeBlocked.label ?? "Talk to support";
  }
  if (action.kind === "remove") {
    return "Remove add-on";
  }
  if (action.kind === "change") {
    return "Change add-on";
  }
  if (action.disabled && action.reason === "feature_usage_exceeded") {
    return "Over plan limit";
  }
  if (action.disabled && action.reason === "checkout_disabled") {
    return "Not available";
  }
  if (action.trial !== null) {
    return action.trial.days === null
      ? "Start trial"
      : `Start ${action.trial.days}-day trial`;
  }
  return options.isAddOn ? "Choose add-on" : "Choose plan";
}

/** "A, B, and C" — `Intl.ListFormat` where available, else a plain join. */
export function conjunction(items: string[], locale: string): string {
  const ListFormat = (
    Intl as unknown as {
      ListFormat?: new (
        l: string,
        o: object,
      ) => { format(i: string[]): string };
    }
  ).ListFormat;
  if (ListFormat !== undefined) {
    return new ListFormat(locale, { type: "conjunction" }).format(items);
  }
  if (items.length <= 1) {
    return items.join("");
  }
  return `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;
}

/** "Seats and API calls usage is over the limit." */
export function usageViolationText(
  features: string[],
  locale: string,
): string | null {
  if (features.length === 0) {
    return null;
  }
  return `${conjunction(features, locale)} usage is over the limit.`;
}

/** The allocation line beside a usage row. */
export function allocationText(allocation: UsageAllocation): string | null {
  switch (allocation.kind) {
    case "limit":
      return `${allocation.quantityText} ${allocation.unit}`;
    case "priced_unit":
      return perUnit(allocation.price);
    case "tier":
      return allocation.toText === null
        ? `Unlimited ${allocation.unit} in this tier`
        : `Up to ${allocation.toText} ${allocation.unit} in this tier`;
    case "credit_rate":
      return `${allocation.rateText} ${allocation.creditUnit} per use`;
    case "credit_limit":
      return `${allocation.quantityText} ${allocation.unit} remaining`;
    case "unlimited":
      return `Unlimited ${allocation.unit}`;
    case "none":
      return null;
  }
}

/** "8,200 of 10,000 used" / "12 used" — the usage line of IncludedFeatures. */
export function usageText(usage: UsageSummary): string | null {
  if (!usage.isMetered) {
    return null;
  }
  const parts: string[] = [];
  if (
    usage.unitPrice !== null &&
    usage.allocation.kind === "limit" &&
    usage.canAddMore
  ) {
    parts.push(perUnitShort(usage.unitPrice));
  } else if (
    usage.allocation.kind !== "limit" &&
    usage.allocation.kind !== "unlimited" &&
    usage.allocation.kind !== "none"
  ) {
    parts.push(`${usage.usage.usedText} ${usage.usage.unit} used`);
  } else if (usage.cost !== null || usage.resetsAt !== null) {
    // A plain limited row keeps its count when cost or reset facts follow.
    parts.push(
      usage.usage.limitText === null
        ? `${usage.usage.usedText} used`
        : `${usage.usage.usedText} of ${usage.usage.limitText} used`,
    );
  }
  if (usage.cost !== null) {
    parts.push(
      usage.cost.periodShort === null
        ? usage.cost.text
        : `${usage.cost.text}/${usage.cost.periodShort}`,
    );
  }
  if (usage.resetsAt !== null) {
    parts.push(`Resets ${usage.resetsAt.text}`);
  }
  if (parts.length > 0) {
    return parts.join(" • ");
  }
  return usage.usage.limitText === null
    ? `${usage.usage.usedText} used`
    : `${usage.usage.usedText} of ${usage.usage.limitText} used`;
}

/** "5 days" / "3 hours". */
export function remainingText(remaining: TimeRemaining): string {
  return `${remaining.amount} ${pluralize(remaining.unit, remaining.amount)}`;
}

/** The PlanManager notice as a title and body. */
export function noticeText(notice: Notice): {
  title: string;
  body: string | null;
} {
  switch (notice.kind) {
    case "trial": {
      const title =
        notice.remaining === null
          ? `Trial ends ${notice.endsAtText}`
          : `Trial ends in ${remainingText(notice.remaining)}`;
      let body: string | null = null;
      if (notice.after?.kind === "subscribe") {
        body =
          "After the trial, your subscription starts and you will be billed.";
      } else if (notice.after?.kind === "downgrade") {
        body = `After the trial, you will move to the ${notice.after.planName} plan. You will not be charged unless you subscribe to a paid plan during the trial.`;
      } else if (notice.after?.kind === "cancel") {
        body = `After the trial, you will lose access to the ${notice.after.planName} plan. You will not be charged unless you subscribe to a paid plan during the trial.`;
      }
      return { title, body };
    }
    case "cancel":
      return {
        title: "Subscription canceled",
        body: `Access to ${notice.planName ?? "your plan"} will end on ${notice.atText}.`,
      };
    case "custom_billing": {
      const plan = notice.planName ?? "your plan";
      return notice.awaitingActivation
        ? {
            title: `Pay to activate ${plan}`,
            body:
              notice.dueAtText === null
                ? "Pay the invoice to activate your custom plan."
                : `Pay the invoice to activate your custom plan. Due by ${notice.dueAtText}.`,
          }
        : {
            title:
              notice.dueAtText === null
                ? `Payment due to keep ${plan}`
                : `Pay by ${notice.dueAtText} to keep ${plan}`,
            body:
              notice.dueAtText === null
                ? `Access to ${plan} will end unless the invoice is paid.`
                : `Access to ${plan} will end on ${notice.dueAtText} unless the invoice is paid.`,
          };
    }
    case "scheduled_downgrade":
      return {
        title: `Downgrade to ${notice.toPlanName} scheduled`,
        body: `Access to ${notice.fromPlanName ?? "your plan"} will end on ${notice.atText}.`,
      };
  }
}
