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
import type { BillingProductPriceTierResponseData } from "./BillingProductPriceTierResponseData";
import {
  BillingProductPriceTierResponseDataFromJSON,
  BillingProductPriceTierResponseDataFromJSONTyped,
  BillingProductPriceTierResponseDataToJSON,
} from "./BillingProductPriceTierResponseData";

/**
 *
 * @export
 * @interface BillingPriceView
 */
export interface BillingPriceView {
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  billingScheme: string;
  /**
   *
   * @type {Date}
   * @memberof BillingPriceView
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  interval: string;
  /**
   *
   * @type {boolean}
   * @memberof BillingPriceView
   */
  isActive: boolean;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  meterEventName?: string | null;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  meterEventPayloadKey?: string | null;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  meterId?: string | null;
  /**
   *
   * @type {number}
   * @memberof BillingPriceView
   */
  packageSize: number;
  /**
   *
   * @type {number}
   * @memberof BillingPriceView
   */
  price: number;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  priceDecimal?: string | null;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  priceExternalId: string;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  priceId: string;
  /**
   *
   * @type {Array<BillingProductPriceTierResponseData>}
   * @memberof BillingPriceView
   */
  priceTier: Array<BillingProductPriceTierResponseData>;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  productExternalId: string;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  productId: string;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  productName: string;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  tiersMode?: string | null;
  /**
   *
   * @type {Date}
   * @memberof BillingPriceView
   */
  updatedAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingPriceView
   */
  usageType: string;
}

/**
 * Check if a given object implements the BillingPriceView interface.
 */
export function instanceOfBillingPriceView(
  value: object,
): value is BillingPriceView {
  if (!("billingScheme" in value) || value["billingScheme"] === undefined)
    return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("interval" in value) || value["interval"] === undefined) return false;
  if (!("isActive" in value) || value["isActive"] === undefined) return false;
  if (!("packageSize" in value) || value["packageSize"] === undefined)
    return false;
  if (!("price" in value) || value["price"] === undefined) return false;
  if (!("priceExternalId" in value) || value["priceExternalId"] === undefined)
    return false;
  if (!("priceId" in value) || value["priceId"] === undefined) return false;
  if (!("priceTier" in value) || value["priceTier"] === undefined) return false;
  if (
    !("productExternalId" in value) ||
    value["productExternalId"] === undefined
  )
    return false;
  if (!("productId" in value) || value["productId"] === undefined) return false;
  if (!("productName" in value) || value["productName"] === undefined)
    return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  if (!("usageType" in value) || value["usageType"] === undefined) return false;
  return true;
}

export function BillingPriceViewFromJSON(json: any): BillingPriceView {
  return BillingPriceViewFromJSONTyped(json, false);
}

export function BillingPriceViewFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingPriceView {
  if (json == null) {
    return json;
  }
  return {
    billingScheme: json["billing_scheme"],
    createdAt: new Date(json["created_at"]),
    currency: json["currency"],
    id: json["id"],
    interval: json["interval"],
    isActive: json["is_active"],
    meterEventName:
      json["meter_event_name"] == null ? undefined : json["meter_event_name"],
    meterEventPayloadKey:
      json["meter_event_payload_key"] == null
        ? undefined
        : json["meter_event_payload_key"],
    meterId: json["meter_id"] == null ? undefined : json["meter_id"],
    packageSize: json["package_size"],
    price: json["price"],
    priceDecimal:
      json["price_decimal"] == null ? undefined : json["price_decimal"],
    priceExternalId: json["price_external_id"],
    priceId: json["price_id"],
    priceTier: (json["price_tier"] as Array<any>).map(
      BillingProductPriceTierResponseDataFromJSON,
    ),
    productExternalId: json["product_external_id"],
    productId: json["product_id"],
    productName: json["product_name"],
    tiersMode: json["tiers_mode"] == null ? undefined : json["tiers_mode"],
    updatedAt: new Date(json["updated_at"]),
    usageType: json["usage_type"],
  };
}

export function BillingPriceViewToJSON(value?: BillingPriceView | null): any {
  if (value == null) {
    return value;
  }
  return {
    billing_scheme: value["billingScheme"],
    created_at: value["createdAt"].toISOString(),
    currency: value["currency"],
    id: value["id"],
    interval: value["interval"],
    is_active: value["isActive"],
    meter_event_name: value["meterEventName"],
    meter_event_payload_key: value["meterEventPayloadKey"],
    meter_id: value["meterId"],
    package_size: value["packageSize"],
    price: value["price"],
    price_decimal: value["priceDecimal"],
    price_external_id: value["priceExternalId"],
    price_id: value["priceId"],
    price_tier: (value["priceTier"] as Array<any>).map(
      BillingProductPriceTierResponseDataToJSON,
    ),
    product_external_id: value["productExternalId"],
    product_id: value["productId"],
    product_name: value["productName"],
    tiers_mode: value["tiersMode"],
    updated_at: value["updatedAt"].toISOString(),
    usage_type: value["usageType"],
  };
}
