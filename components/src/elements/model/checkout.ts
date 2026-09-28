import type {
  Catalog,
  CatalogCreditBundle,
  CatalogPlan,
  Checkout,
  CheckoutProblem,
  Company,
  FeatureUsage,
} from "@schematichq/schematic-react";

import {
  cartAddOns,
  cartBundles,
  cartPayInAdvance,
  cartPlan,
  checkoutCurrencies,
  isCreditOnly,
  offeredAddOns,
  offeredBundles,
  quantityOf,
  trialActive,
  type CheckoutCart,
} from "./checkoutCart";
import type { CheckoutDisplay, CheckoutStep } from "./checkoutConfig";
import {
  CHECKOUT_PERIODS,
  bundlePrice,
  isFree,
  isOneTime,
  planPeriods,
  planPrice,
  type CatalogPrice,
  type CheckoutPeriod,
} from "./checkoutPrices";
import { checkoutSelections } from "./checkoutSelections";
import { stepOfProblem } from "./checkoutSteps";
import { featureName, formatCurrency, formatDate, usableDate } from "./format";

/**
 * `deriveCheckout`: the checkout as display parts. Line items are the
 * catalog's prices times the cart's quantities, which is what the customer is
 * choosing between; the totals are the server's, from the checkout's last
 * price, and nothing here adds them up.
 */

export interface PlanRow {
  id: string;
  name: string;
  description: string;
  /** The price for the cart's period in its currency; `null` when the plan is not priced there. */
  priceText: string | null;
  /** Whether the price renews each period rather than once. */
  recurring: boolean;
  free: boolean;
  current: boolean;
  selected: boolean;
  /** The company may move to it; `false` comes with `invalidReason`. */
  valid: boolean;
  invalidReason: CatalogPlan["invalidReason"] | null;
  /** Days of trial the company would get; `null` when there is none for it. */
  trialDays: number | null;
}

export interface QuantityRow {
  featureId: string;
  /** The feature's name for the quantity chosen. */
  name: string;
  /** Per unit, for the period. */
  unitPriceText: string | null;
  quantity: number;
  /** What the company has now; `null` when it has none. */
  currentQuantity: number | null;
  /** The quantity times the unit price. */
  totalText: string | null;
}

export interface BundleRow {
  id: string;
  name: string;
  /** Credits one purchase grants; `null` for a bundle bought by the credit. */
  credits: number | null;
  creditName: string;
  priceText: string | null;
  quantity: number;
}

export interface AutoTopupRow {
  grantId: string;
  creditName: string;
  enabled: boolean;
  thresholdCredits: number | null;
  amount: number | null;
  /** What one top-up costs at the credit's price; `null` when it is unpriced. */
  costText: string | null;
}

export interface SummaryLine {
  key: string;
  label: string;
  /** How many, for a line bought in a quantity. */
  quantity: number | null;
  amountText: string;
}

export interface CheckoutTotals {
  dueNowText: string;
  /** What renews each period; `null` for a purchase that does not renew. */
  totalPerPeriodText: string | null;
  /** The credit or charge for the time left on the current subscription. */
  prorationText: string | null;
  /** What discounts took off, as a deduction. */
  discountText: string | null;
  taxText: string | null;
  promoCodeApplied: boolean;
  /** The day a trial ends and the first charge lands. */
  trialEndText: string | null;
  /** The change waits for the period to end rather than landing now. */
  scheduledChangeText: string | null;
}

export interface CheckoutProblems {
  /** Problems about one step, keyed by it. */
  byStep: Partial<Record<CheckoutStep, CheckoutProblem[]>>;
  /** Problems about the checkout as a whole. */
  global: CheckoutProblem[];
  /** Any problem that stops a finalize. */
  blocking: boolean;
}

export interface CheckoutModel {
  currency: {
    value: string;
    options: string[];
    /** Fixed by the subscription. */
    locked: boolean;
    /** More than one on offer, and the host shows the choice. */
    selectable: boolean;
  };
  period: {
    value: CheckoutPeriod;
    /** The periods the chosen plan, else any plan, is sold on. */
    options: CheckoutPeriod[];
    selectable: boolean;
  };
  plans: PlanRow[];
  addOns: PlanRow[];
  usage: QuantityRow[];
  addOnUsage: QuantityRow[];
  bundles: BundleRow[];
  /** One bundle at a time, or a count of each. */
  bundleMode: "individual" | "quantity";
  autoTopups: AutoTopupRow[];
  /** What the cart holds, at catalog prices. */
  lines: SummaryLine[];
  /** The server's totals; `null` until the cart has been priced. */
  totals: CheckoutTotals | null;
  /** A trial starts with this purchase. */
  trial: boolean;
  /** There is something to price. */
  priceable: boolean;
  problems: CheckoutProblems;
  /** What the card form collects beside the card. */
  collect: { address: boolean; email: boolean; phone: boolean };
  /** What the payment step collects. */
  requirements: {
    collectTaxId: boolean;
    customFields: {
      id: string;
      name: string;
      helperText: string | null;
      required: boolean;
      value: string;
    }[];
    optIn: { required: boolean; title: string | null; text: string | null };
    paymentMethodRequired: boolean;
  };
  /** Whether the checkout may be finalized as it stands. */
  canFinalize: boolean;
}

export interface DeriveCheckoutInput {
  catalog: Catalog;
  company?: Company;
  featureUsage?: FeatureUsage[];
  cart: CheckoutCart;
  /** The checkout as the server last priced it. */
  checkout?: Checkout;
  /** A write is in flight or waiting. */
  isPricing?: boolean;
  display?: CheckoutDisplay;
  locale: string;
}

const priceText = (
  price: CatalogPrice | undefined,
  locale: string,
  quantity = 1,
): string | null => {
  if (price === undefined) {
    return null;
  }
  const unit =
    typeof price.priceDecimal === "string"
      ? Number(price.priceDecimal)
      : price.price;
  return formatCurrency(unit * quantity, price.currency, locale);
};

/**
 * The period the cart can actually be priced on: its own when the plan sells
 * it, else the longest one the plan does sell.
 */
export function normalizePeriod(
  cart: CheckoutCart,
  catalog: Catalog,
): CheckoutPeriod {
  const plan = cartPlan(cart, catalog);
  if (plan === undefined || isOneTime(plan)) {
    return cart.period;
  }
  const periods = planPeriods(plan);
  if (periods.length === 0 || periods.includes(cart.period)) {
    return cart.period;
  }
  return periods[periods.length - 1];
}

function planRow(
  plan: CatalogPlan,
  cart: CheckoutCart,
  locale: string,
  selected: boolean,
): PlanRow {
  return {
    id: plan.id,
    name: plan.name,
    description: plan.description,
    priceText: priceText(planPrice(plan, cart.period, cart.currency), locale),
    recurring: !isOneTime(plan),
    free: isFree(plan),
    current: plan.current,
    selected,
    valid: plan.valid,
    invalidReason: plan.invalidReason ?? null,
    trialDays:
      plan.isTrialable && plan.companyCanTrial
        ? (plan.trialDays ?? null)
        : null,
  };
}

function bundleRow(
  bundle: CatalogCreditBundle,
  cart: CheckoutCart,
  locale: string,
): BundleRow {
  const credits = bundle.quantity ?? null;
  return {
    id: bundle.id,
    name: bundle.name,
    credits,
    creditName: featureName(
      {
        name: bundle.creditName,
        pluralName: bundle.creditPluralName,
        singularName: bundle.creditSingularName,
      },
      credits ?? 2,
      locale,
    ),
    priceText: priceText(bundlePrice(bundle, cart.currency), locale),
    quantity: cart.bundles[bundle.id] ?? 0,
  };
}

function groupProblems(
  problems: CheckoutProblem[],
  input: Pick<DeriveCheckoutInput, "cart" | "catalog">,
): CheckoutProblems {
  const byStep: CheckoutProblems["byStep"] = {};
  const global: CheckoutProblem[] = [];
  for (const problem of problems) {
    const step = stepOfProblem(problem, input);
    if (step === undefined) {
      global.push(problem);
    } else {
      (byStep[step] ??= []).push(problem);
    }
  }
  return { byStep, global, blocking: problems.some((p) => p.blocking) };
}

export function deriveCheckout(input: DeriveCheckoutInput): CheckoutModel {
  const {
    catalog,
    checkout,
    company,
    display,
    featureUsage = [],
    locale,
  } = input;
  const currencies = checkoutCurrencies(catalog, company, display);
  const cart = { ...input.cart, period: normalizePeriod(input.cart, catalog) };
  const plan = cartPlan(cart, catalog);
  const trial = trialActive(cart, plan);
  const creditOnly = isCreditOnly(cart, catalog, company);
  const snapshot = checkout?.priceSnapshot;
  const currentAllocation = (featureId: string): number | null =>
    featureUsage.find(
      (u) => u.featureId === featureId && u.priceBehavior === "pay_in_advance",
    )?.allocation ?? null;

  const periodOptions =
    plan !== undefined && !isOneTime(plan)
      ? planPeriods(plan)
      : CHECKOUT_PERIODS.filter((period) =>
          catalog.plans.some((p) => planPeriods(p).includes(period)),
        );

  const quantityRows = (owners: "plan" | "addOns"): QuantityRow[] =>
    cartPayInAdvance(cart, catalog)
      .filter((line) =>
        owners === "plan"
          ? line.owner.id === plan?.id
          : line.owner.id !== plan?.id,
      )
      .map(({ entitlement, price }) => {
        const quantity = quantityOf(cart, entitlement.featureId);
        return {
          featureId: entitlement.featureId,
          name: featureName(
            {
              name: entitlement.featureName,
              pluralName: entitlement.featurePluralName,
              singularName: entitlement.featureSingularName,
            },
            quantity,
            locale,
          ),
          unitPriceText: priceText(price, locale),
          quantity,
          currentQuantity: currentAllocation(entitlement.featureId),
          totalText: priceText(price, locale, quantity),
        };
      });

  const bundlesOffered = offeredBundles(cart, catalog, company);

  const lines: SummaryLine[] = [];
  if (plan !== undefined) {
    const price = planPrice(plan, cart.period, cart.currency);
    if (price !== undefined) {
      lines.push({
        key: `plan:${plan.id}`,
        label: plan.name,
        quantity: null,
        amountText: priceText(price, locale) as string,
      });
    }
    for (const addOn of cartAddOns(cart, catalog)) {
      lines.push({
        key: `addOn:${addOn.id}`,
        label: addOn.name,
        quantity: null,
        amountText: priceText(
          planPrice(addOn, cart.period, cart.currency),
          locale,
        ) as string,
      });
    }
    for (const row of [...quantityRows("plan"), ...quantityRows("addOns")]) {
      if (row.totalText !== null) {
        lines.push({
          key: `usage:${row.featureId}`,
          label: row.name,
          quantity: row.quantity,
          amountText: row.totalText,
        });
      }
    }
  }
  for (const bundle of cartBundles(cart, catalog, company)) {
    const count = cart.bundles[bundle.id];
    lines.push({
      key: `bundle:${bundle.id}`,
      label: bundle.name,
      quantity: count,
      // Per purchase for a bundle of a set size, per credit for one bought by
      // the credit: either way, the count times the price.
      amountText: priceText(
        bundlePrice(bundle, cart.currency),
        locale,
        count,
      ) as string,
    });
  }

  let totals: CheckoutTotals | null = null;
  if (snapshot !== undefined) {
    const currency = snapshot.currency || cart.currency;
    const money = (amount: number) => formatCurrency(amount, currency, locale);
    const renews = plan !== undefined && !isOneTime(plan) && !creditOnly;
    const trialEnd = usableDate(snapshot.trialEnd);
    const scheduled = usableDate(snapshot.scheduledChangeTime);
    totals = {
      dueNowText: money(snapshot.dueNow),
      totalPerPeriodText: renews ? money(snapshot.totalPerBillingPeriod) : null,
      prorationText:
        snapshot.proration !== 0 ? money(snapshot.proration) : null,
      discountText:
        snapshot.discountAmount > 0 ? money(-snapshot.discountAmount) : null,
      taxText:
        snapshot.taxAmount != null && snapshot.taxAmount !== 0
          ? money(snapshot.taxAmount)
          : null,
      promoCodeApplied: snapshot.promoCodeApplied,
      trialEndText:
        trialEnd === undefined ? null : formatDate(trialEnd, locale),
      scheduledChangeText:
        snapshot.isScheduledDowngrade && scheduled !== undefined
          ? formatDate(scheduled, locale)
          : null,
    };
  }

  const problems = groupProblems(checkout?.problems ?? [], { cart, catalog });
  const priceable = checkoutSelections(cart, catalog, company) !== undefined;
  const addOnsOffered = offeredAddOns(cart, catalog);

  return {
    currency: {
      value: cart.currency,
      options: currencies.options,
      locked: currencies.locked !== undefined,
      selectable:
        currencies.locked === undefined &&
        currencies.options.length > 1 &&
        display?.showCurrencySelector !== false,
    },
    period: {
      value: cart.period,
      options: periodOptions,
      selectable:
        periodOptions.length > 1 && display?.showPeriodToggle !== false,
    },
    plans: catalog.plans.map((p) =>
      planRow(p, cart, locale, p.id === plan?.id),
    ),
    addOns: addOnsOffered.map((addOn) =>
      planRow(addOn, cart, locale, cart.addOnIds.includes(addOn.id)),
    ),
    usage: quantityRows("plan"),
    addOnUsage: quantityRows("addOns"),
    bundles: bundlesOffered.map((bundle) => bundleRow(bundle, cart, locale)),
    bundleMode:
      catalog.checkoutSettings.bundlePurchaseBehavior === "individual"
        ? "individual"
        : "quantity",
    autoTopups: (plan?.autoTopups ?? [])
      .filter((topup) => topup.availability === "user_controlled")
      .map((topup) => {
        const choice = cart.autoTopup[topup.planCreditGrantId] ?? {};
        const amount =
          choice.amount ?? topup.companyAmount ?? topup.amount ?? null;
        const unit = topup.unitPrice;
        return {
          grantId: topup.planCreditGrantId,
          creditName:
            plan?.includedCreditGrants.find(
              (g) => g.creditId === topup.creditId,
            )?.creditName ?? "",
          enabled: choice.enabled ?? topup.companyEnabled ?? topup.enabled,
          thresholdCredits:
            choice.thresholdCredits ??
            topup.companyThresholdCredits ??
            topup.thresholdCredits ??
            null,
          amount,
          costText:
            amount === null || unit === undefined
              ? null
              : priceText(unit, locale, amount),
        };
      }),
    lines,
    totals,
    trial,
    priceable,
    problems,
    collect: {
      address: catalog.checkoutSettings.collectAddress,
      email: catalog.checkoutSettings.collectEmail,
      phone: catalog.checkoutSettings.collectPhone,
    },
    requirements: {
      collectTaxId: catalog.checkoutSettings.collectTaxId,
      customFields: catalog.checkoutSettings.customFields.map((field) => ({
        id: field.id,
        name: field.name,
        helperText: field.helperText ?? null,
        required: field.required,
        value: cart.customFields[field.id] ?? "",
      })),
      optIn: {
        required: snapshot?.optInRequired ?? false,
        title: snapshot?.optInTitle ?? null,
        text: snapshot?.optInText ?? null,
      },
      paymentMethodRequired: snapshot?.paymentMethodRequired ?? false,
    },
    canFinalize:
      priceable &&
      snapshot !== undefined &&
      input.isPricing !== true &&
      !problems.blocking,
  };
}
