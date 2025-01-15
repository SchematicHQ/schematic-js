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
 * @interface CreateBillingPriceRequestBody
 */
export interface CreateBillingPriceRequestBody {
  /**
   *
   * @type {string}
   * @memberof CreateBillingPriceRequestBody
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof CreateBillingPriceRequestBody
   */
  interval: string;
  /**
   *
   * @type {string}
   * @memberof CreateBillingPriceRequestBody
   */
  meterId?: string | null;
  /**
   *
   * @type {number}
   * @memberof CreateBillingPriceRequestBody
   */
  price: number;
  /**
   *
   * @type {string}
   * @memberof CreateBillingPriceRequestBody
   */
  priceExternalId: string;
  /**
   *
   * @type {string}
   * @memberof CreateBillingPriceRequestBody
   */
  productExternalId: string;
  /**
   *
   * @type {string}
   * @memberof CreateBillingPriceRequestBody
   */
  usageType: string;
}

/**
 * Check if a given object implements the CreateBillingPriceRequestBody interface.
 */
export function instanceOfCreateBillingPriceRequestBody(
  value: object,
): value is CreateBillingPriceRequestBody {
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (!("interval" in value) || value["interval"] === undefined) return false;
  if (!("price" in value) || value["price"] === undefined) return false;
  if (!("priceExternalId" in value) || value["priceExternalId"] === undefined)
    return false;
  if (
    !("productExternalId" in value) ||
    value["productExternalId"] === undefined
  )
    return false;
  if (!("usageType" in value) || value["usageType"] === undefined) return false;
  return true;
}

export function CreateBillingPriceRequestBodyFromJSON(
  json: any,
): CreateBillingPriceRequestBody {
  return CreateBillingPriceRequestBodyFromJSONTyped(json, false);
}

export function CreateBillingPriceRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateBillingPriceRequestBody {
  if (json == null) {
    return json;
  }
  return {
    currency: json["currency"],
    interval: json["interval"],
    meterId: json["meter_id"] == null ? undefined : json["meter_id"],
    price: json["price"],
    priceExternalId: json["price_external_id"],
    productExternalId: json["product_external_id"],
    usageType: json["usage_type"],
  };
}

export function CreateBillingPriceRequestBodyToJSON(
  json: any,
): CreateBillingPriceRequestBody {
  return CreateBillingPriceRequestBodyToJSONTyped(json, false);
}

export function CreateBillingPriceRequestBodyToJSONTyped(
  value?: CreateBillingPriceRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    currency: value["currency"],
    interval: value["interval"],
    meter_id: value["meterId"],
    price: value["price"],
    price_external_id: value["priceExternalId"],
    product_external_id: value["productExternalId"],
    usage_type: value["usageType"],
  };
}
