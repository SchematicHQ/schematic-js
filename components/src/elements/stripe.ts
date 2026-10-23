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
 * A confirmation the customer failed or abandoned. Stripe takes the card off
 * an intent whose authentication failed, so the retry has to name it again:
 * `paymentMethodId` is that card, when Stripe said which.
 */
export class PaymentNotConfirmedError extends Error {
  readonly paymentMethodId: string | undefined;

  constructor(message: string, paymentMethodId: string | undefined) {
    super(message);
    this.name = "PaymentNotConfirmedError";
    this.paymentMethodId = paymentMethodId;
  }
}

/**
 * Completes a payment that needs the customer — 3-D Secure, most often —
 * after the server has charged the card on file. Resolves once the payment
 * succeeded; rejects with Stripe's message when the customer failed or
 * abandoned it. `paymentMethodId` names the card for a retry, since a failed
 * attempt leaves the intent without one.
 */
export async function confirmPayment(
  stripe: Stripe,
  clientSecret: string,
  paymentMethodId?: string,
): Promise<void> {
  const result =
    paymentMethodId === undefined
      ? await stripe.confirmCardPayment(clientSecret)
      : await stripe.confirmCardPayment(clientSecret, {
          payment_method: paymentMethodId,
        });
  if (result.error !== undefined) {
    const failed =
      result.error.payment_method?.id ??
      result.error.payment_intent?.last_payment_error?.payment_method?.id;
    throw new PaymentNotConfirmedError(
      result.error.message ?? "The payment was not confirmed.",
      failed,
    );
  }
}
