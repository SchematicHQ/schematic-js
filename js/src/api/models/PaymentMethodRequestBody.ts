/* tslint:disable */
/* eslint-disable */
/**
 * Schematic API
 * Schematic API
 *
 * The version of the OpenAPI document: 0.1
 *
 *
 * NOTE: This class is auto generated by OpenAPI Generator (https://openapi-generator.tech).
 * https://openapi-generator.tech
 * Do not edit the class manually.
 */

import { mapValues } from "../runtime";
/**
 *
 * @export
 * @interface PaymentMethodRequestBody
 */
export interface PaymentMethodRequestBody {
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  accountLast4?: string | null;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  accountName?: string | null;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  bankName?: string | null;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  billingEmail?: string | null;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  billingName?: string | null;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  cardBrand?: string | null;
  /**
   *
   * @type {number}
   * @memberof PaymentMethodRequestBody
   */
  cardExpMonth?: number | null;
  /**
   *
   * @type {number}
   * @memberof PaymentMethodRequestBody
   */
  cardExpYear?: number | null;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  cardLast4?: string | null;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  customerExternalId: string;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  paymentMethodType: string;
  /**
   *
   * @type {string}
   * @memberof PaymentMethodRequestBody
   */
  subscriptionExternalId?: string | null;
}

/**
 * Check if a given object implements the PaymentMethodRequestBody interface.
 */
export function instanceOfPaymentMethodRequestBody(
  value: object,
): value is PaymentMethodRequestBody {
  if (
    !("customerExternalId" in value) ||
    value["customerExternalId"] === undefined
  )
    return false;
  if (
    !("paymentMethodType" in value) ||
    value["paymentMethodType"] === undefined
  )
    return false;
  return true;
}

export function PaymentMethodRequestBodyFromJSON(
  json: any,
): PaymentMethodRequestBody {
  return PaymentMethodRequestBodyFromJSONTyped(json, false);
}

export function PaymentMethodRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PaymentMethodRequestBody {
  if (json == null) {
    return json;
  }
  return {
    accountLast4:
      json["account_last4"] == null ? undefined : json["account_last4"],
    accountName:
      json["account_name"] == null ? undefined : json["account_name"],
    bankName: json["bank_name"] == null ? undefined : json["bank_name"],
    billingEmail:
      json["billing_email"] == null ? undefined : json["billing_email"],
    billingName:
      json["billing_name"] == null ? undefined : json["billing_name"],
    cardBrand: json["card_brand"] == null ? undefined : json["card_brand"],
    cardExpMonth:
      json["card_exp_month"] == null ? undefined : json["card_exp_month"],
    cardExpYear:
      json["card_exp_year"] == null ? undefined : json["card_exp_year"],
    cardLast4: json["card_last4"] == null ? undefined : json["card_last4"],
    customerExternalId: json["customer_external_id"],
    paymentMethodType: json["payment_method_type"],
    subscriptionExternalId:
      json["subscription_external_id"] == null
        ? undefined
        : json["subscription_external_id"],
  };
}

export function PaymentMethodRequestBodyToJSON(
  json: any,
): PaymentMethodRequestBody {
  return PaymentMethodRequestBodyToJSONTyped(json, false);
}

export function PaymentMethodRequestBodyToJSONTyped(
  value?: PaymentMethodRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    account_last4: value["accountLast4"],
    account_name: value["accountName"],
    bank_name: value["bankName"],
    billing_email: value["billingEmail"],
    billing_name: value["billingName"],
    card_brand: value["cardBrand"],
    card_exp_month: value["cardExpMonth"],
    card_exp_year: value["cardExpYear"],
    card_last4: value["cardLast4"],
    customer_external_id: value["customerExternalId"],
    payment_method_type: value["paymentMethodType"],
    subscription_external_id: value["subscriptionExternalId"],
  };
}
