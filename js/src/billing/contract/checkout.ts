/**
 * `POST /checkouts`, `GET` and `PUT /checkouts/{checkout_id}`, and
 * `POST /checkouts/{checkout_id}/finalize`: a persisted cart the server
 * prices on every write and completes on finalize. The wire shapes are
 * generated from the API's spec by scripts/generate-billing-api.sh and
 * re-exported here under their domain names.
 */

import type {
  CheckoutDraftResponseData,
  CheckoutFieldValue,
  CheckoutPriceSnapshot,
  CheckoutProblemResponseData,
  CheckoutResponseData,
  UpdateAddOnRequestBody,
  UpdateAutoTopupOverrideRequestBody,
  UpdateCreditBundleRequestBody,
  UpdatePayInAdvanceRequestBody,
} from "../api/generated/models";
import {
  CheckoutFieldValueToJSON,
  CheckoutProblemResponseDataFromJSON,
  UpdateAddOnRequestBodyToJSON,
  UpdateAutoTopupOverrideRequestBodyToJSON,
  UpdateCreditBundleRequestBodyToJSON,
  UpdatePayInAdvanceRequestBodyToJSON,
} from "../api/generated/models";
import { SchematicApiError } from "../session";

export {
  CheckoutIntent,
  CheckoutProblemCode,
  CheckoutProblemSource,
  CheckoutStatus,
} from "../api/generated/models";
export type {
  CheckoutDraftResponseData,
  CheckoutPriceSnapshot,
  CheckoutProblemResponseData,
  CheckoutResponseData,
};

/**
 * One checkout as the server holds it: its `selections`, the `version` a
 * write must name, the price it was last priced at (`priceSnapshot`, absent
 * until the cart is priceable), and what is wrong with it (`problems`).
 */
export type Checkout = CheckoutDraftResponseData;

/**
 * Something the last price found wrong. `blocking` means a finalize would be
 * refused while it stands; the ids say what it is about, so a client can show
 * it next to the thing it concerns.
 */
export type CheckoutProblem = CheckoutProblemResponseData;

/** What a finalize charged: the subscription, and a 3-D Secure secret when the payment needs one. */
export type CheckoutResult = CheckoutResponseData;

/**
 * The cart. Every write sends all of it — an update replaces the stored cart —
 * so a field left out is a field cleared. No plan and price is a cart with
 * nothing but credit bundles in it, or nothing at all.
 */
export interface CheckoutSelections {
  addOns?: UpdateAddOnRequestBody[];
  autoTopupOverrides?: UpdateAutoTopupOverrideRequestBody[];
  creditBundles?: UpdateCreditBundleRequestBody[];
  /** ISO 4217. A cart that prices in another currency reports a problem. */
  currency?: string;
  customFieldValues?: CheckoutFieldValue[];
  /** `cancel` ends the subscription; the default is a change to the cart. */
  intent?: "change" | "cancel";
  optInAccepted?: boolean;
  payInAdvance?: UpdatePayInAdvanceRequestBody[];
  /** The provider's id of a method already on file. */
  paymentMethodId?: string;
  planId?: string;
  priceId?: string;
  promoCode?: string;
  skipTrial?: boolean;
}

/**
 * A write's answer: the checkout, and the session the server priced it
 * under. Sent back on the finalize that follows, the session is what turns a
 * second submit of the same cart into a 409 rather than a second charge.
 */
export interface CheckoutWrite {
  checkout: Checkout;
  sessionId?: string;
}

/** The selections as the API reads them. */
export function checkoutSelectionsToJSON(
  selections: CheckoutSelections,
): Record<string, unknown> {
  const wire: Record<string, unknown> = {
    add_on_ids: (selections.addOns ?? []).map((a) =>
      UpdateAddOnRequestBodyToJSON(a),
    ),
    auto_topup_overrides: (selections.autoTopupOverrides ?? []).map((o) =>
      UpdateAutoTopupOverrideRequestBodyToJSON(o),
    ),
    credit_bundles: (selections.creditBundles ?? []).map((b) =>
      UpdateCreditBundleRequestBodyToJSON(b),
    ),
    custom_field_values: (selections.customFieldValues ?? []).map((v) =>
      CheckoutFieldValueToJSON(v),
    ),
    pay_in_advance: (selections.payInAdvance ?? []).map((p) =>
      UpdatePayInAdvanceRequestBodyToJSON(p),
    ),
    skip_trial: selections.skipTrial ?? false,
  };
  const optional: [string, unknown][] = [
    ["currency", selections.currency],
    ["intent", selections.intent],
    ["new_plan_id", selections.planId],
    ["new_price_id", selections.priceId],
    ["opt_in_accepted", selections.optInAccepted],
    ["payment_method_id", selections.paymentMethodId],
    ["promo_code", selections.promoCode],
  ];
  for (const [key, value] of optional) {
    if (value !== undefined && value !== "") {
      wire[key] = value;
    }
  }
  return wire;
}

/**
 * The problems a refused write or finalize carried, or `undefined` when the
 * error is not one: a finalize the server stops on a blocking problem answers
 * 400 with the list beside its message.
 */
export function checkoutProblemsOf(
  error: unknown,
): CheckoutProblem[] | undefined {
  if (!(error instanceof SchematicApiError)) {
    return undefined;
  }
  const body = error.body as { problems?: unknown } | null;
  if (
    body === null ||
    typeof body !== "object" ||
    !Array.isArray(body.problems)
  ) {
    return undefined;
  }
  return body.problems.map((p) => CheckoutProblemResponseDataFromJSON(p));
}
