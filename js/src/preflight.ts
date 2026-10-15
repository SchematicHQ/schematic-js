import {
  CheckFlagReturn,
  CreditBalances,
  CreditSpendPolicies,
  CreditSpendPolicy,
  PreflightInput,
  RuleType,
} from "./types";

// Inference token keys, in the order the burn prices them.
const inferenceQuantityKeys = [
  "input_tokens",
  "output_tokens",
  "cached_input_tokens",
  "cache_creation_input_tokens",
  "reasoning_tokens",
];

// The burn clamps every quantity to this.
const maxQuantity = 1_000_000_000;

// The server refuses maps larger than this and subtypes longer than this, so
// such input goes to it rather than being judged here.
const maxMapEntries = 100;
const maxEventSubtypeLength = 128;

/**
 * The credits one event would burn: `baseQuantity` at `consumptionRate`, plus
 * each key `quantityRates` rates times the event's quantity for it. Must match
 * the API's burn and the rules engine to the bit, so keys are summed in the
 * same order and the cached / cache-creation subsets come out of input tokens.
 */
export const quantityCost = (
  consumptionRate: number,
  quantityRates: Record<string, number>,
  baseQuantity: number,
  quantities: Record<string, number>,
): number => {
  let cost = 0;
  const base = baseQuantity * consumptionRate;
  if (base !== 0) {
    cost += base;
  }

  const rateKeys = Object.keys(quantityRates);
  if (rateKeys.length === 0) {
    return cost;
  }

  // No prototype, so a rated key like `constructor` the event lacks reads as
  // undefined rather than an inherited function.
  const normalized: Record<string, number> = Object.create(null);
  for (const [key, value] of Object.entries(quantities)) {
    const v = Number.isNaN(value) ? 0 : value;
    normalized[key] = Math.min(Math.max(v, 0), maxQuantity);
  }
  const input = normalized.input_tokens;
  if (input !== undefined) {
    const cached = normalized.cached_input_tokens ?? 0;
    const cacheCreation = normalized.cache_creation_input_tokens ?? 0;
    normalized.input_tokens = Math.max(input - cached - cacheCreation, 0);
  }

  const order = [
    ...inferenceQuantityKeys.filter((key) => key in quantityRates),
    ...rateKeys.filter((key) => !inferenceQuantityKeys.includes(key)).sort(),
  ];
  for (const key of order) {
    const credits = (normalized[key] ?? 0) * quantityRates[key];
    if (credits !== 0) {
      cost += credits;
    }
  }

  return cost;
};

const isNonNegative = (n: number): boolean => Number.isFinite(n) && n >= 0;

const isNonNegativeInt = (n: number): boolean =>
  Number.isSafeInteger(n) && n >= 0;

const isValidMap = (m: Record<string, number>): boolean => {
  const values = Object.values(m);
  return values.length <= maxMapEntries && values.every(isNonNegative);
};

const isValidSubtype = (subtype: string): boolean =>
  subtype.length > 0 && subtype.length <= maxEventSubtypeLength;

// Input the server would reject or read differently is left to the server.
const isValidInput = (input: PreflightInput): boolean => {
  if (input.creditCost !== undefined && !isValidMap(input.creditCost)) {
    return false;
  }
  if (input.usage !== undefined && !isNonNegativeInt(input.usage)) {
    return false;
  }
  const { eventUsage, eventQuantities } = input;
  if (
    eventUsage !== undefined &&
    (!isValidSubtype(eventUsage.eventSubtype) ||
      !isNonNegativeInt(eventUsage.quantity))
  ) {
    return false;
  }
  if (
    eventQuantities !== undefined &&
    (!isValidSubtype(eventQuantities.eventSubtype) ||
      (eventQuantities.quantity !== undefined &&
        !isNonNegative(eventQuantities.quantity)) ||
      (eventQuantities.quantities !== undefined &&
        !isValidMap(eventQuantities.quantities)))
  ) {
    return false;
  }
  return true;
};

const policyAllows = (
  policy: CreditSpendPolicy,
  cost: number,
  now: Date,
): boolean => {
  switch (policy.kind) {
    case "per_draw":
      return cost <= policy.limit;
    case "window": {
      // A window that has ended was measured over a period that is over.
      const windowEnded =
        policy.resetsAt !== undefined &&
        now.getTime() >= policy.resetsAt.getTime();
      const consumed = windowEnded ? 0 : policy.consumed;
      return consumed + cost <= policy.limit;
    }
    default:
      return true;
  }
};

const evaluateCredit = (
  result: CheckFlagReturn,
  creditId: string,
  balances: CreditBalances | undefined,
  policies: CreditSpendPolicies | undefined,
  input: PreflightInput,
  now: Date,
): boolean | undefined => {
  const balance = balances?.[creditId];
  if (
    result.creditRemaining === undefined ||
    balance === undefined ||
    balance.postpaid === undefined
  ) {
    return undefined;
  }

  let cost: number;
  let requireHeadroom = false;
  const explicitCost = input.creditCost?.[creditId];
  if (explicitCost !== undefined) {
    // An explicit cost is gated as-is, so zero passes at a zero balance.
    cost = explicitCost;
  } else {
    // The engine reads a missing rate as 1, but a missing rate here may only
    // mean the server predates the field.
    const rate = result.consumptionRate;
    if (rate === undefined) {
      return undefined;
    }

    const { eventQuantities, eventUsage } = input;
    const eventUsageQuantity =
      eventUsage !== undefined && eventUsage.quantity > 0
        ? eventUsage.quantity
        : undefined;
    const subtype = result.eventSubtype;
    if (
      subtype === undefined &&
      (eventQuantities !== undefined || eventUsageQuantity !== undefined)
    ) {
      return undefined;
    }

    if (
      eventQuantities !== undefined &&
      eventQuantities.eventSubtype === subtype
    ) {
      const quantity = eventQuantities.quantity;
      cost = quantityCost(
        rate,
        result.quantityRates ?? {},
        quantity !== undefined && quantity > 0 ? quantity : 1,
        eventQuantities.quantities ?? {},
      );
    } else if (
      eventUsageQuantity !== undefined &&
      eventUsage?.eventSubtype === subtype
    ) {
      cost = quantityCost(rate, {}, eventUsageQuantity, {});
    } else if (input.usage !== undefined && input.usage > 0) {
      cost = input.usage * rate;
    } else {
      cost = rate;
    }
    // A cost priced from the rates that comes to zero still needs headroom.
    requireHeadroom = cost === 0;
  }

  const refused = (policies ?? []).some(
    (policy) =>
      policy.creditId === creditId && !policyAllows(policy, cost, now),
  );
  if (refused) {
    return false;
  }

  let allowance = 0;
  if (balance.postpaid) {
    if (balance.overdraftLimit === undefined) {
      return true;
    }
    allowance = balance.overdraftLimit;
  }

  const available = result.creditRemaining + allowance;
  return requireHeadroom ? available > cost : available >= cost;
};

const evaluateNumeric = (
  result: CheckFlagReturn,
  input: PreflightInput,
): boolean | undefined => {
  const isMetric =
    result.eventSubtype !== undefined || result.featureUsageEvent !== undefined;
  const usage = input.usage !== undefined && input.usage > 0 ? input.usage : 0;

  if (!isMetric) {
    // A trait condition's comparison depends on the trait's type and on
    // whether it is a company or user trait, neither of which the result
    // carries.
    return usage > 0 ? undefined : result.value;
  }

  const { eventUsage } = input;
  let delta = usage;
  if (eventUsage !== undefined && eventUsage.quantity > 0) {
    if (result.eventSubtype === undefined) {
      return undefined;
    }
    if (eventUsage.eventSubtype === result.eventSubtype) {
      delta = eventUsage.quantity;
    }
  }

  if (delta === 0) {
    return result.value;
  }
  if (
    result.featureUsage === undefined ||
    result.featureAllocation === undefined
  ) {
    return undefined;
  }

  // The API writes the entitling metric condition as usage < allocation.
  return result.featureUsage + delta < result.featureAllocation;
};

/**
 * Decide a preflight from a cached flag check, mirroring the rules engine.
 * Returns undefined when the cached result does not carry enough to decide,
 * in which case the caller must ask the server.
 *
 * Only an allow is decided here, apart from a rule that turned the flag off.
 * When the cached winning rule would stop matching, the engine goes on to try
 * the flag's other company override and plan entitlement rules (a base plan
 * and an add-on granting the feature on different credits, or an override
 * with a tighter limit than the plan). The cached result carries only the
 * winner, so it cannot see whether one of those would still grant the flag,
 * and a local deny goes to the server instead.
 */
export const evaluatePreflight = (
  result: CheckFlagReturn | undefined,
  balances: CreditBalances | undefined,
  policies: CreditSpendPolicies | undefined,
  input: PreflightInput,
  now: Date = new Date(),
): boolean | undefined => {
  if (result === undefined || !isValidInput(input)) {
    return undefined;
  }

  switch (result.ruleType) {
    case RuleType.COMPANY_OVERRIDE:
    case RuleType.PLAN_ENTITLEMENT:
      // The rule turned the flag off; a preflight cannot widen that.
      // Safe only because API-built entitling rules that turn a flag off carry no credit or metric condition.
      if (!result.value) {
        return false;
      }
      break;
    case RuleType.COMPANY_OVERRIDE_USAGE_EXCEEDED:
    case RuleType.PLAN_ENTITLEMENT_USAGE_EXCEEDED:
      break;
    default:
      return undefined;
  }

  if (result.creditId !== undefined) {
    const allowed = evaluateCredit(
      result,
      result.creditId,
      balances,
      policies,
      input,
      now,
    );
    return allowed === true ? true : undefined;
  }

  if (result.featureAllocation === undefined) {
    return result.value ? true : undefined;
  }

  return evaluateNumeric(result, input) === true ? true : undefined;
};
