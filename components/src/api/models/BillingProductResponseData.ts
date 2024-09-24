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
 * @interface BillingProductResponseData
 */
export interface BillingProductResponseData {
  /**
   *
   * @type {string}
   * @memberof BillingProductResponseData
   */
  accountId: string;
  /**
   *
   * @type {Date}
   * @memberof BillingProductResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingProductResponseData
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductResponseData
   */
  externalId: string;
  /**
   *
   * @type {string}
   * @memberof BillingProductResponseData
   */
  name: string;
  /**
   *
   * @type {number}
   * @memberof BillingProductResponseData
   */
  price: number;
  /**
   *
   * @type {string}
   * @memberof BillingProductResponseData
   */
  productId: string;
  /**
   *
   * @type {number}
   * @memberof BillingProductResponseData
   */
  quantity: number;
  /**
   *
   * @type {Date}
   * @memberof BillingProductResponseData
   */
  updatedAt: Date;
}

/**
 * Check if a given object implements the BillingProductResponseData interface.
 */
export function instanceOfBillingProductResponseData(
  value: object,
): value is BillingProductResponseData {
  if (!("accountId" in value) || value["accountId"] === undefined) return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("externalId" in value) || value["externalId"] === undefined)
    return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("price" in value) || value["price"] === undefined) return false;
  if (!("productId" in value) || value["productId"] === undefined) return false;
  if (!("quantity" in value) || value["quantity"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  return true;
}

export function BillingProductResponseDataFromJSON(
  json: any,
): BillingProductResponseData {
  return BillingProductResponseDataFromJSONTyped(json, false);
}

export function BillingProductResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingProductResponseData {
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
    productId: json["product_id"],
    quantity: json["quantity"],
    updatedAt: new Date(json["updated_at"]),
  };
}

export function BillingProductResponseDataToJSON(
  value?: BillingProductResponseData | null,
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
    product_id: value["productId"],
    quantity: value["quantity"],
    updated_at: value["updatedAt"].toISOString(),
  };
}