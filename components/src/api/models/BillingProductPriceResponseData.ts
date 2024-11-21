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
 * @interface BillingProductPriceResponseData
 */
export interface BillingProductPriceResponseData {
  /**
   *
   * @type {Date}
   * @memberof BillingProductPriceResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingProductPriceResponseData
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductPriceResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductPriceResponseData
   */
  interval: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductPriceResponseData
   */
  meterId?: string | null;
  /**
   *
   * @type {number}
   * @memberof BillingProductPriceResponseData
   */
  price: number;
  /**
   *
   * @type {string}
   * @memberof BillingProductPriceResponseData
   */
  priceExternalId: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductPriceResponseData
   */
  productExternalId: string;
  /**
   *
   * @type {Date}
   * @memberof BillingProductPriceResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingProductPriceResponseData
   */
  usageType: string;
}

/**
 * Check if a given object implements the BillingProductPriceResponseData interface.
 */
export function instanceOfBillingProductPriceResponseData(
  value: object,
): value is BillingProductPriceResponseData {
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("interval" in value) || value["interval"] === undefined) return false;
  if (!("price" in value) || value["price"] === undefined) return false;
  if (!("priceExternalId" in value) || value["priceExternalId"] === undefined)
    return false;
  if (
    !("productExternalId" in value) ||
    value["productExternalId"] === undefined
  )
    return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  if (!("usageType" in value) || value["usageType"] === undefined) return false;
  return true;
}

export function BillingProductPriceResponseDataFromJSON(
  json: any,
): BillingProductPriceResponseData {
  return BillingProductPriceResponseDataFromJSONTyped(json, false);
}

export function BillingProductPriceResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingProductPriceResponseData {
  if (json == null) {
    return json;
  }
  return {
    createdAt: new Date(json["created_at"]),
    currency: json["currency"],
    id: json["id"],
    interval: json["interval"],
    meterId: json["meter_id"] == null ? undefined : json["meter_id"],
    price: json["price"],
    priceExternalId: json["price_external_id"],
    productExternalId: json["product_external_id"],
    updatedAt: new Date(json["updated_at"]),
    usageType: json["usage_type"],
  };
}

export function BillingProductPriceResponseDataToJSON(
  value?: BillingProductPriceResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    created_at: value["createdAt"].toISOString(),
    currency: value["currency"],
    id: value["id"],
    interval: value["interval"],
    meter_id: value["meterId"],
    price: value["price"],
    price_external_id: value["priceExternalId"],
    product_external_id: value["productExternalId"],
    updated_at: value["updatedAt"].toISOString(),
    usage_type: value["usageType"],
  };
}
