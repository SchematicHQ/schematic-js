import type {
  Catalog,
  CheckoutSelections,
  Company,
} from "@schematichq/schematic-react";

import {
  cartAddOns,
  cartBundles,
  cartPayInAdvance,
  cartPlan,
  quantityOf,
  trialActive,
  type CheckoutCart,
} from "./checkoutCart";
import { planPrice } from "./checkoutPrices";

/**
 * The cart as the API reads it, or `undefined` when there is nothing to
 * price: no plan priced in the cart's period and currency, and no bundles
 * to buy on their own.
 */
export function checkoutSelections(
  cart: CheckoutCart,
  catalog: Catalog,
  company?: Company,
): CheckoutSelections | undefined {
  const plan = cartPlan(cart, catalog);
  const price =
    plan === undefined
      ? undefined
      : planPrice(plan, cart.period, cart.currency);
  const bundles = cartBundles(cart, catalog, company);
  if (price === undefined && (plan !== undefined || bundles.length === 0)) {
    return undefined;
  }

  const trial = trialActive(cart, plan);
  const customFieldValues = Object.entries(cart.customFields)
    .filter(([, value]) => value.trim() !== "")
    .map(([id, value]) => ({ id, value }));

  const selections: CheckoutSelections = {
    creditBundles: bundles.map((bundle) => ({
      bundleId: bundle.id,
      quantity: cart.bundles[bundle.id],
    })),
    currency: cart.currency,
    customFieldValues,
    optInAccepted: cart.optInAccepted || undefined,
    paymentMethodId: cart.paymentMethodId,
    promoCode: cart.promoCode,
    skipTrial: !trial,
  };

  if (plan !== undefined && price !== undefined) {
    selections.planId = plan.id;
    selections.priceId = price.id;
    selections.addOns = cartAddOns(cart, catalog).map((addOn) => ({
      addOnId: addOn.id,
      priceId: planPrice(addOn, cart.period, cart.currency)?.id as string,
    }));
    selections.payInAdvance = cartPayInAdvance(cart, catalog).flatMap(
      ({ entitlement, price: unit }) =>
        unit === undefined
          ? []
          : [
              {
                priceId: unit.id,
                quantity: quantityOf(cart, entitlement.featureId),
              },
            ],
    );
    selections.autoTopupOverrides = plan.autoTopups.flatMap((topup) => {
      const choice = cart.autoTopup[topup.planCreditGrantId];
      if (topup.availability !== "user_controlled" || choice === undefined) {
        return [];
      }
      return [
        {
          autoTopupAmount: choice.amount,
          autoTopupEnabled: choice.enabled,
          autoTopupThresholdCredits: choice.thresholdCredits,
          planCreditGrantId: topup.planCreditGrantId,
        },
      ];
    });
  }

  return selections;
}
