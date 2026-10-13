import type { SetupIntent } from "@schematichq/schematic-react";
import type {
  Stripe,
  StripeConstructorOptions,
  StripeElementLocale,
} from "@stripe/stripe-js";

/**
 * Stripe.js, loaded for the account a setup intent names. Shared by the card
 * form and the checkout's payment confirmation, and imported at runtime, so a
 * page that never takes a card never downloads Stripe.
 */

const STRIPE_NOT_LOADED = "Stripe.js did not load.";

/**
 * A connected account loads through Schematic's key with the account named;
 * any other uses its own key, else Schematic's.
 */
export async function loadStripeForIntent(
  intent: SetupIntent,
  locale: string,
): Promise<Stripe> {
  const stripeJs = await import("@stripe/stripe-js");
  let publishableKey = intent.publishableKey ?? intent.schematicPublishableKey;
  const options: StripeConstructorOptions = {
    locale: locale as StripeElementLocale,
  };
  if (intent.accountId !== undefined && intent.accountId !== null) {
    publishableKey = intent.schematicPublishableKey;
    options.stripeAccount = intent.accountId;
  }
  const stripe = await stripeJs.loadStripe(publishableKey, options);
  if (stripe === null) {
    throw new Error(STRIPE_NOT_LOADED);
  }
  return stripe;
}

/**
 * Completes a payment that needs the customer — 3-D Secure, most often —
 * after the server has charged the card on file. Resolves once the payment
 * succeeded; rejects with Stripe's message when the customer failed or
 * abandoned it.
 */
export async function confirmPayment(
  stripe: Stripe,
  clientSecret: string,
): Promise<void> {
  const result = await stripe.confirmCardPayment(clientSecret);
  if (result.error !== undefined) {
    throw new Error(result.error.message ?? "The payment was not confirmed.");
  }
}
