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
 * @interface BillingSubscriptionDiscountView
 */
export interface BillingSubscriptionDiscountView {
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionDiscountView
   */
  amountOff?: number | null;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionDiscountView
   */
  couponId: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionDiscountView
   */
  couponName: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionDiscountView
   */
  currency?: string | null;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionDiscountView
   */
  customerFacingCode?: string | null;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionDiscountView
   */
  discountExternalId: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionDiscountView
   */
  duration: string;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionDiscountView
   */
  durationInMonths?: number | null;
  /**
   *
   * @type {Date}
   * @memberof BillingSubscriptionDiscountView
   */
  endedAt?: Date | null;
  /**
   *
   * @type {boolean}
   * @memberof BillingSubscriptionDiscountView
   */
  isActive: boolean;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionDiscountView
   */
  percentOff?: number | null;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionDiscountView
   */
  promoCodeExternalId?: string | null;
  /**
   *
   * @type {Date}
   * @memberof BillingSubscriptionDiscountView
   */
  startedAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionDiscountView
   */
  subscriptionExternalId: string;
}

/**
 * Check if a given object implements the BillingSubscriptionDiscountView interface.
 */
export function instanceOfBillingSubscriptionDiscountView(
  value: object,
): value is BillingSubscriptionDiscountView {
  if (!("couponId" in value) || value["couponId"] === undefined) return false;
  if (!("couponName" in value) || value["couponName"] === undefined)
    return false;
  if (
    !("discountExternalId" in value) ||
    value["discountExternalId"] === undefined
  )
    return false;
  if (!("duration" in value) || value["duration"] === undefined) return false;
  if (!("isActive" in value) || value["isActive"] === undefined) return false;
  if (!("startedAt" in value) || value["startedAt"] === undefined) return false;
  if (
    !("subscriptionExternalId" in value) ||
    value["subscriptionExternalId"] === undefined
  )
    return false;
  return true;
}

export function BillingSubscriptionDiscountViewFromJSON(
  json: any,
): BillingSubscriptionDiscountView {
  return BillingSubscriptionDiscountViewFromJSONTyped(json, false);
}

export function BillingSubscriptionDiscountViewFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingSubscriptionDiscountView {
  if (json == null) {
    return json;
  }
  return {
    amountOff: json["amount_off"] == null ? undefined : json["amount_off"],
    couponId: json["coupon_id"],
    couponName: json["coupon_name"],
    currency: json["currency"] == null ? undefined : json["currency"],
    customerFacingCode:
      json["customer_facing_code"] == null
        ? undefined
        : json["customer_facing_code"],
    discountExternalId: json["discount_external_id"],
    duration: json["duration"],
    durationInMonths:
      json["duration_in_months"] == null
        ? undefined
        : json["duration_in_months"],
    endedAt: json["ended_at"] == null ? undefined : new Date(json["ended_at"]),
    isActive: json["is_active"],
    percentOff: json["percent_off"] == null ? undefined : json["percent_off"],
    promoCodeExternalId:
      json["promo_code_external_id"] == null
        ? undefined
        : json["promo_code_external_id"],
    startedAt: new Date(json["started_at"]),
    subscriptionExternalId: json["subscription_external_id"],
  };
}

export function BillingSubscriptionDiscountViewToJSON(
  value?: BillingSubscriptionDiscountView | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    amount_off: value["amountOff"],
    coupon_id: value["couponId"],
    coupon_name: value["couponName"],
    currency: value["currency"],
    customer_facing_code: value["customerFacingCode"],
    discount_external_id: value["discountExternalId"],
    duration: value["duration"],
    duration_in_months: value["durationInMonths"],
    ended_at:
      value["endedAt"] == null
        ? undefined
        : (value["endedAt"] as any).toISOString(),
    is_active: value["isActive"],
    percent_off: value["percentOff"],
    promo_code_external_id: value["promoCodeExternalId"],
    started_at: value["startedAt"].toISOString(),
    subscription_external_id: value["subscriptionExternalId"],
  };
}
