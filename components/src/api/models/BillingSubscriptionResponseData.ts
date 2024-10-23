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
 * The created resource
 * @export
 * @interface BillingSubscriptionResponseData
 */
export interface BillingSubscriptionResponseData {
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionResponseData
   */
  companyId?: string | null;
  /**
   *
   * @type {Date}
   * @memberof BillingSubscriptionResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionResponseData
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionResponseData
   */
  customerExternalId: string;
  /**
   *
   * @type {Date}
   * @memberof BillingSubscriptionResponseData
   */
  expiredAt?: Date | null;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionResponseData
   */
  interval: string;
  /**
   *
   * @type {object}
   * @memberof BillingSubscriptionResponseData
   */
  metadata?: object;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionResponseData
   */
  periodEnd: number;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionResponseData
   */
  periodStart: number;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionResponseData
   */
  status: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionResponseData
   */
  subscriptionExternalId: string;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionResponseData
   */
  totalPrice: number;
}

/**
 * Check if a given object implements the BillingSubscriptionResponseData interface.
 */
export function instanceOfBillingSubscriptionResponseData(
  value: object,
): value is BillingSubscriptionResponseData {
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (
    !("customerExternalId" in value) ||
    value["customerExternalId"] === undefined
  )
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("interval" in value) || value["interval"] === undefined) return false;
  if (!("periodEnd" in value) || value["periodEnd"] === undefined) return false;
  if (!("periodStart" in value) || value["periodStart"] === undefined)
    return false;
  if (!("status" in value) || value["status"] === undefined) return false;
  if (
    !("subscriptionExternalId" in value) ||
    value["subscriptionExternalId"] === undefined
  )
    return false;
  if (!("totalPrice" in value) || value["totalPrice"] === undefined)
    return false;
  return true;
}

export function BillingSubscriptionResponseDataFromJSON(
  json: any,
): BillingSubscriptionResponseData {
  return BillingSubscriptionResponseDataFromJSONTyped(json, false);
}

export function BillingSubscriptionResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingSubscriptionResponseData {
  if (json == null) {
    return json;
  }
  return {
    companyId: json["company_id"] == null ? undefined : json["company_id"],
    createdAt: new Date(json["created_at"]),
    currency: json["currency"],
    customerExternalId: json["customer_external_id"],
    expiredAt:
      json["expired_at"] == null ? undefined : new Date(json["expired_at"]),
    id: json["id"],
    interval: json["interval"],
    metadata: json["metadata"] == null ? undefined : json["metadata"],
    periodEnd: json["period_end"],
    periodStart: json["period_start"],
    status: json["status"],
    subscriptionExternalId: json["subscription_external_id"],
    totalPrice: json["total_price"],
  };
}

export function BillingSubscriptionResponseDataToJSON(
  value?: BillingSubscriptionResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    company_id: value["companyId"],
    created_at: value["createdAt"].toISOString(),
    currency: value["currency"],
    customer_external_id: value["customerExternalId"],
    expired_at:
      value["expiredAt"] == null
        ? undefined
        : (value["expiredAt"] as any).toISOString(),
    id: value["id"],
    interval: value["interval"],
    metadata: value["metadata"],
    period_end: value["periodEnd"],
    period_start: value["periodStart"],
    status: value["status"],
    subscription_external_id: value["subscriptionExternalId"],
    total_price: value["totalPrice"],
  };
}
