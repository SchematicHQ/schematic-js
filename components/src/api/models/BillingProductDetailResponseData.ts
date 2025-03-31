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
import type { BillingPriceResponseData } from "./BillingPriceResponseData";
import {
  BillingPriceResponseDataFromJSON,
  BillingPriceResponseDataFromJSONTyped,
  BillingPriceResponseDataToJSON,
} from "./BillingPriceResponseData";

/**
 *
 * @export
 * @interface BillingProductDetailResponseData
 */
export interface BillingProductDetailResponseData {
  /**
   *
   * @type {string}
   * @memberof BillingProductDetailResponseData
   */
  accountId: string;
  /**
   *
   * @type {Date}
   * @memberof BillingProductDetailResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingProductDetailResponseData
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductDetailResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductDetailResponseData
   */
  externalId: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductDetailResponseData
   */
  name: string;
  /**
   *
   * @type {number}
   * @memberof BillingProductDetailResponseData
   */
  price: number;
  /**
   *
   * @type {Array<BillingPriceResponseData>}
   * @memberof BillingProductDetailResponseData
   */
  prices: Array<BillingPriceResponseData>;
  /**
   *
   * @type {string}
   * @memberof BillingProductDetailResponseData
   */
  productId: string;
  /**
   *
   * @type {number}
   * @memberof BillingProductDetailResponseData
   */
  quantity: number;
  /**
   *
   * @type {number}
   * @memberof BillingProductDetailResponseData
   */
  subscriptionCount: number;
  /**
   *
   * @type {Date}
   * @memberof BillingProductDetailResponseData
   */
  updatedAt: Date;
}

/**
 * Check if a given object implements the BillingProductDetailResponseData interface.
 */
export function instanceOfBillingProductDetailResponseData(
  value: object,
): value is BillingProductDetailResponseData {
  if (!("accountId" in value) || value["accountId"] === undefined) return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("externalId" in value) || value["externalId"] === undefined)
    return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("price" in value) || value["price"] === undefined) return false;
  if (!("prices" in value) || value["prices"] === undefined) return false;
  if (!("productId" in value) || value["productId"] === undefined) return false;
  if (!("quantity" in value) || value["quantity"] === undefined) return false;
  if (
    !("subscriptionCount" in value) ||
    value["subscriptionCount"] === undefined
  )
    return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  return true;
}

export function BillingProductDetailResponseDataFromJSON(
  json: any,
): BillingProductDetailResponseData {
  return BillingProductDetailResponseDataFromJSONTyped(json, false);
}

export function BillingProductDetailResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingProductDetailResponseData {
  if (json == null) {
    return json;
  }
  return {
    accountId: json["account_id"],
    createdAt: new Date(json["created_at"]),
    currency: json["currency"],
    environmentId: json["environment_id"],
    externalId: json["external_id"],
    name: json["name"],
    price: json["price"],
    prices: (json["prices"] as Array<any>).map(
      BillingPriceResponseDataFromJSON,
    ),
    productId: json["product_id"],
    quantity: json["quantity"],
    subscriptionCount: json["subscription_count"],
    updatedAt: new Date(json["updated_at"]),
  };
}

export function BillingProductDetailResponseDataToJSON(
  value?: BillingProductDetailResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    account_id: value["accountId"],
    created_at: value["createdAt"].toISOString(),
    currency: value["currency"],
    environment_id: value["environmentId"],
    external_id: value["externalId"],
    name: value["name"],
    price: value["price"],
    prices: (value["prices"] as Array<any>).map(BillingPriceResponseDataToJSON),
    product_id: value["productId"],
    quantity: value["quantity"],
    subscription_count: value["subscriptionCount"],
    updated_at: value["updatedAt"].toISOString(),
  };
}
