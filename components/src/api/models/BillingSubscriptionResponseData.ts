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
  currency: string;
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
  externalId: string;
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
   * @type {number}
   * @memberof BillingSubscriptionResponseData
   */
  totalPrice: number;
  /**
   *
   * @type {Date}
   * @memberof BillingSubscriptionResponseData
   */
  updatedAt: Date;
}

/**
 * Check if a given object implements the BillingSubscriptionResponseData interface.
 */
export function instanceOfBillingSubscriptionResponseData(
  value: object,
): value is BillingSubscriptionResponseData {
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (!("externalId" in value) || value["externalId"] === undefined)
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("interval" in value) || value["interval"] === undefined) return false;
  if (!("totalPrice" in value) || value["totalPrice"] === undefined)
    return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
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
    currency: json["currency"],
    expiredAt:
      json["expired_at"] == null ? undefined : new Date(json["expired_at"]),
    externalId: json["external_id"],
    id: json["id"],
    interval: json["interval"],
    totalPrice: json["total_price"],
    updatedAt: new Date(json["updated_at"]),
  };
}

export function BillingSubscriptionResponseDataToJSON(
  value?: BillingSubscriptionResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    currency: value["currency"],
    expired_at:
      value["expiredAt"] == null
        ? undefined
        : (value["expiredAt"] as any).toISOString(),
    external_id: value["externalId"],
    id: value["id"],
    interval: value["interval"],
    total_price: value["totalPrice"],
    updated_at: value["updatedAt"].toISOString(),
  };
}
