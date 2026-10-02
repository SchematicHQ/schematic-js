import type {
  Catalog,
  CatalogPlan,
  Company,
  FeatureUsage,
  PaymentMethod,
} from "@schematichq/schematic-react";

import type {
  AutoTopupChoice,
  CheckoutConfig,
  CheckoutDisplay,
} from "./checkoutConfig";
import {
  bundlePrice,
  compatibleWith,
  entitlementPrice,
  isPayInAdvance,
  periodOfPrice,
  planCurrencies,
  planPrice,
  type CheckoutPeriod,
} from "./checkoutPrices";

/**
 * What the customer has chosen, before the server prices it. The server
 * never sees this shape: `checkoutSelections` turns it into the cart the API
 * reads, and the server's answer is the only source of prices and problems.
 */
export interface CheckoutCart {
  /** `undefined` is no plan: none chosen yet, or a purchase of bundles alone. */
  planId: string | undefined;
  period: CheckoutPeriod;
  /** Lowercase ISO 4217. */
  currency: string;
  addOnIds: string[];
  /** Pay-in-advance quantities by feature id. */
  quantities: Record<string, number>;
  /** Credit bundle counts by bundle id; zero is not bought. */
  bundles: Record<string, number>;
  /** The company's own top-ups, by plan credit grant id. */
  autoTopup: Record<string, AutoTopupChoice>;
  promoCode: string | undefined;
  /** Start a trial when the plan offers one. */
  trial: boolean;
  /** Custom checkout field values by field id. */
  customFields: Record<string, string>;
  /** The provider's id of the method to pay with. */
  paymentMethodId: string | undefined;
  optInAccepted: boolean;
}

export interface CheckoutCurrencies {
  /** The currencies on offer, lowercase, the default first. */
  options: string[];
  /** The subscription's currency, when it fixes the cart's. */
  locked: string | undefined;
}

/**
 * The currencies a cart may be built in. A subscription has one currency and
 * a change keeps it; without one, whatever the catalog prices its plans in,
 * narrowed and ordered by the host's list.
 */
export function checkoutCurrencies(
  catalog: Catalog,
  company: Company | undefined,
  display: CheckoutDisplay | undefined,
): CheckoutCurrencies {
  const locked = company?.subscription?.currency?.toLowerCase() || undefined;
  const offered = new Set<string>([catalog.defaultCurrency.toLowerCase()]);
  for (const plan of catalog.plans) {
    planCurrencies(plan).forEach((currency) => offered.add(currency));
  }
  const wanted = display?.currencies?.map((c) => c.toLowerCase());
  const options =
    wanted === undefined
      ? [...offered]
      : wanted.filter((currency) => offered.has(currency));
  if (locked !== undefined) {
    return { options: [locked], locked };
  }
  return {
    options: options.length > 0 ? options : [...offered],
    locked: undefined,
  };
}

/** The period a subscription renews on, when it is one a cart can choose. */
export function subscriptionPeriod(
  company: Company | undefined,
): CheckoutPeriod | undefined {
  const sub = company?.subscription;
  return sub === undefined ? undefined : periodOfPrice(sub);
}

export interface InitialCartInput {
  catalog: Catalog;
  company?: Company;
  featureUsage?: FeatureUsage[];
  paymentMethods?: PaymentMethod[];
  config?: CheckoutConfig;
}

/** Whole and not negative. */
export const clampQuantity = (quantity: number): number =>
  Number.isFinite(quantity) ? Math.max(0, Math.floor(quantity)) : 0;

/**
 * The cart a checkout opens on: the host's selection over what the company
 * has now.
 */
export function initialCart({
  catalog,
  company,
  config,
  featureUsage = [],
  paymentMethods = [],
}: InitialCartInput): CheckoutCart {
  const selection = config?.selection ?? {};
  const currencies = checkoutCurrencies(catalog, company, config?.display);
  const wantedCurrency = selection.currency?.toLowerCase();
  const currency =
    currencies.locked ??
    (wantedCurrency !== undefined && currencies.options.includes(wantedCurrency)
      ? wantedCurrency
      : currencies.options[0]);

  let planId: string | undefined;
  if (selection.planId === null) {
    planId = undefined;
  } else if (selection.planId !== undefined) {
    planId = catalog.plans.some((p) => p.id === selection.planId)
      ? selection.planId
      : undefined;
  } else {
    // A company that can start a trial on its own plan decides for itself.
    planId = catalog.plans.find(
      (p) => p.current && !(p.isTrialable && p.companyCanTrial),
    )?.id;
  }

  const quantities: Record<string, number> = {};
  for (const usage of featureUsage) {
    if (usage.priceBehavior === "pay_in_advance" && usage.allocation != null) {
      quantities[usage.featureId] = clampQuantity(usage.allocation);
    }
  }
  for (const [featureId, quantity] of Object.entries(
    selection.quantities ?? {},
  )) {
    quantities[featureId] = clampQuantity(quantity);
  }

  const individual =
    catalog.checkoutSettings.bundlePurchaseBehavior === "individual";
  const bundles: Record<string, number> = {};
  for (const [bundleId, count] of Object.entries(
    selection.creditBundles ?? {},
  )) {
    const quantity = clampQuantity(count);
    if (quantity > 0) {
      bundles[bundleId] = individual ? 1 : quantity;
    }
  }

  const customFields: Record<string, string> = {};
  for (const field of catalog.checkoutSettings.customFields) {
    if (field.value != null) {
      customFields[field.id] = field.value;
    }
  }
  Object.assign(customFields, selection.customFields);

  return {
    planId,
    period: selection.period ?? subscriptionPeriod(company) ?? "month",
    currency,
    addOnIds:
      selection.addOnIds ??
      catalog.addOns.filter((a) => a.current).map((a) => a.id),
    quantities,
    bundles,
    autoTopup: { ...selection.autoTopup },
    promoCode: selection.promoCode || undefined,
    trial: selection.trial ?? true,
    customFields,
    paymentMethodId: paymentMethods.find((m) => m.isDefault)?.externalId,
    optInAccepted: false,
  };
}

export type CartAction =
  | { type: "plan"; planId: string | undefined }
  | { type: "period"; period: CheckoutPeriod }
  | { type: "currency"; currency: string }
  | { type: "addOn"; addOnId: string; selected: boolean }
  | { type: "quantity"; featureId: string; quantity: number }
  | { type: "bundle"; bundleId: string; quantity: number }
  | { type: "autoTopup"; grantId: string; choice: AutoTopupChoice }
  | { type: "promoCode"; promoCode: string | undefined }
  | { type: "trial"; trial: boolean }
  | { type: "customField"; fieldId: string; value: string }
  | { type: "paymentMethod"; paymentMethodId: string | undefined }
  | { type: "optIn"; accepted: boolean };

export function cartReducer(
  cart: CheckoutCart,
  action: CartAction,
): CheckoutCart {
  switch (action.type) {
    case "plan":
      return { ...cart, planId: action.planId };
    case "period":
      return { ...cart, period: action.period };
    case "currency":
      return { ...cart, currency: action.currency.toLowerCase() };
    case "addOn": {
      const without = cart.addOnIds.filter((id) => id !== action.addOnId);
      return {
        ...cart,
        addOnIds: action.selected ? [...without, action.addOnId] : without,
      };
    }
    case "quantity":
      return {
        ...cart,
        quantities: {
          ...cart.quantities,
          [action.featureId]: clampQuantity(action.quantity),
        },
      };
    case "bundle": {
      const bundles = { ...cart.bundles };
      const quantity = clampQuantity(action.quantity);
      if (quantity === 0) {
        delete bundles[action.bundleId];
      } else {
        bundles[action.bundleId] = quantity;
      }
      return { ...cart, bundles };
    }
    case "autoTopup":
      return {
        ...cart,
        autoTopup: {
          ...cart.autoTopup,
          [action.grantId]: {
            ...cart.autoTopup[action.grantId],
            ...action.choice,
          },
        },
      };
    case "promoCode":
      return { ...cart, promoCode: action.promoCode || undefined };
    case "trial":
      return { ...cart, trial: action.trial };
    case "customField":
      return {
        ...cart,
        customFields: { ...cart.customFields, [action.fieldId]: action.value },
      };
    case "paymentMethod":
      return { ...cart, paymentMethodId: action.paymentMethodId };
    case "optIn":
      return { ...cart, optInAccepted: action.accepted };
  }
}

/** A pay-in-advance quantity the cart has not set starts at one. */
export const quantityOf = (cart: CheckoutCart, featureId: string): number =>
  cart.quantities[featureId] ?? 1;

/** The plan the cart names, if the catalog sells it. */
export function cartPlan(
  cart: CheckoutCart,
  catalog: Catalog,
): CatalogPlan | undefined {
  return cart.planId === undefined
    ? undefined
    : catalog.plans.find((p) => p.id === cart.planId);
}

/** A trial the cart will start: offered, open to the company, and wanted. */
export function trialActive(
  cart: CheckoutCart,
  plan: CatalogPlan | undefined,
): boolean {
  return (
    plan !== undefined && plan.isTrialable && plan.companyCanTrial && cart.trial
  );
}

/** The add-ons the cart may carry with its plan, as the catalog sells them. */
export function cartAddOns(
  cart: CheckoutCart,
  catalog: Catalog,
): CatalogPlan[] {
  return offeredAddOns(cart, catalog).filter((addOn) =>
    cart.addOnIds.includes(addOn.id),
  );
}

/**
 * The add-ons the catalog sells with the cart's plan, in its period and
 * currency. None without a plan or while a trial is starting.
 */
export function offeredAddOns(
  cart: CheckoutCart,
  catalog: Catalog,
): CatalogPlan[] {
  const plan = cartPlan(cart, catalog);
  if (plan === undefined || trialActive(cart, plan)) {
    return [];
  }
  return catalog.addOns.filter(
    (addOn) =>
      compatibleWith(addOn.compatiblePlanIds, plan.id) &&
      planPrice(addOn, cart.period, cart.currency) !== undefined,
  );
}

/** Bundles counted in the cart, as the catalog sells them with its plan. */
export function cartBundles(
  cart: CheckoutCart,
  catalog: Catalog,
  company: Company | undefined,
) {
  return offeredBundles(cart, catalog, company).filter(
    (bundle) => (cart.bundles[bundle.id] ?? 0) > 0,
  );
}

/**
 * The bundles the catalog sells with the cart's plan, else the company's, in
 * the cart's currency.
 */
export function offeredBundles(
  cart: CheckoutCart,
  catalog: Catalog,
  company: Company | undefined,
) {
  const planId = cartPlan(cart, catalog)?.id ?? company?.plan?.id;
  return catalog.creditBundles.filter(
    (bundle) =>
      compatibleWith(bundle.compatiblePlanIds, planId) &&
      bundlePrice(bundle, cart.currency) !== undefined,
  );
}

/** No plan, and some bundles: a purchase of credits alone. */
export function isCreditOnly(
  cart: CheckoutCart,
  catalog: Catalog,
  company: Company | undefined,
): boolean {
  return (
    cartPlan(cart, catalog) === undefined &&
    cartBundles(cart, catalog, company).length > 0
  );
}

/** The pay-in-advance entitlements the cart prices: the plan's, then each add-on's. */
export function cartPayInAdvance(cart: CheckoutCart, catalog: Catalog) {
  const plan = cartPlan(cart, catalog);
  if (plan === undefined) {
    return [];
  }
  return [plan, ...cartAddOns(cart, catalog)].flatMap((owner) =>
    owner.entitlements.filter(isPayInAdvance).map((entitlement) => ({
      owner,
      entitlement,
      price: entitlementPrice(entitlement, cart.period, cart.currency),
    })),
  );
}
