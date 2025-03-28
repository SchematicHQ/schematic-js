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
 * @interface BillingProductForSubscriptionResponseData
 */
export interface BillingProductForSubscriptionResponseData {
  /**
   *
   * @type {Date}
   * @memberof BillingProductForSubscriptionResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  externalId: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  interval: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  meterId?: string | null;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  name: string;
  /**
   *
   * @type {number}
   * @memberof BillingProductForSubscriptionResponseData
   */
  price: number;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  priceDecimal?: string | null;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  priceExternalId: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  priceId: string;
  /**
   *
   * @type {number}
   * @memberof BillingProductForSubscriptionResponseData
   */
  quantity: number;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  subscriptionId: string;
  /**
   *
   * @type {Date}
   * @memberof BillingProductForSubscriptionResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingProductForSubscriptionResponseData
   */
  usageType: string;
}

/**
 * Check if a given object implements the BillingProductForSubscriptionResponseData interface.
 */
export function instanceOfBillingProductForSubscriptionResponseData(
  value: object,
): value is BillingProductForSubscriptionResponseData {
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("externalId" in value) || value["externalId"] === undefined)
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("interval" in value) || value["interval"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("price" in value) || value["price"] === undefined) return false;
  if (!("priceExternalId" in value) || value["priceExternalId"] === undefined)
    return false;
  if (!("priceId" in value) || value["priceId"] === undefined) return false;
  if (!("quantity" in value) || value["quantity"] === undefined) return false;
  if (!("subscriptionId" in value) || value["subscriptionId"] === undefined)
    return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  if (!("usageType" in value) || value["usageType"] === undefined) return false;
  return true;
}

export function BillingProductForSubscriptionResponseDataFromJSON(
  json: any,
): BillingProductForSubscriptionResponseData {
  return BillingProductForSubscriptionResponseDataFromJSONTyped(json, false);
}

export function BillingProductForSubscriptionResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingProductForSubscriptionResponseData {
  if (json == null) {
    return json;
  }
  return {
    createdAt: new Date(json["created_at"]),
    currency: json["currency"],
    environmentId: json["environment_id"],
    externalId: json["external_id"],
    id: json["id"],
    interval: json["interval"],
    meterId: json["meter_id"] == null ? undefined : json["meter_id"],
    name: json["name"],
    price: json["price"],
    priceDecimal:
      json["price_decimal"] == null ? undefined : json["price_decimal"],
    priceExternalId: json["price_external_id"],
    priceId: json["price_id"],
    quantity: json["quantity"],
    subscriptionId: json["subscription_id"],
    updatedAt: new Date(json["updated_at"]),
    usageType: json["usage_type"],
  };
}

export function BillingProductForSubscriptionResponseDataToJSON(
  value?: BillingProductForSubscriptionResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    created_at: value["createdAt"].toISOString(),
    currency: value["currency"],
    environment_id: value["environmentId"],
    external_id: value["externalId"],
    id: value["id"],
    interval: value["interval"],
    meter_id: value["meterId"],
    name: value["name"],
    price: value["price"],
    price_decimal: value["priceDecimal"],
    price_external_id: value["priceExternalId"],
    price_id: value["priceId"],
    quantity: value["quantity"],
    subscription_id: value["subscriptionId"],
    updated_at: value["updatedAt"].toISOString(),
    usage_type: value["usageType"],
  };
}
