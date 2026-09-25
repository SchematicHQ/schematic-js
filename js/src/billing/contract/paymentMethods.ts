/**
 * `GET /company/payment-methods`, and the writes beside it: a setup intent
 * for adding a method, an update that makes one the default, and a delete.
 * The wire shapes are generated from the API's spec by
 * scripts/generate-billing-api.sh and re-exported here under their domain
 * names.
 */

import type {
  CompanyPaymentMethodResponseData,
  SetupIntentResponseData,
} from "../api/generated/models";

export type { CompanyPaymentMethodResponseData, SetupIntentResponseData };

/**
 * One way the company pays. Two flags the server has already decided, so a
 * consumer never re-derives a provider's rules:
 *
 * * `isDefault` — the subscription's default method, or, when the
 *   subscription names none, the customer's.
 * * `canRemove` — whether a delete would be accepted; the server's rule,
 *   not `!isDefault`.
 *
 * `id` is Schematic's, and is what a delete takes; `externalId` is the
 * provider's, and is what making it the default takes.
 */
export type PaymentMethod = CompanyPaymentMethodResponseData;

/** What a provider's card form is mounted with to add a method. */
export type SetupIntent = SetupIntentResponseData;
