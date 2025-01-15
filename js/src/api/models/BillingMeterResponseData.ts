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
 * @interface BillingMeterResponseData
 */
export interface BillingMeterResponseData {
  /**
   *
   * @type {string}
   * @memberof BillingMeterResponseData
   */
  dispalyName: string;
  /**
   *
   * @type {string}
   * @memberof BillingMeterResponseData
   */
  eventName: string;
  /**
   *
   * @type {string}
   * @memberof BillingMeterResponseData
   */
  eventPayloadKey: string;
  /**
   *
   * @type {string}
   * @memberof BillingMeterResponseData
   */
  externalPriceId: string;
  /**
   *
   * @type {string}
   * @memberof BillingMeterResponseData
   */
  id: string;
}

/**
 * Check if a given object implements the BillingMeterResponseData interface.
 */
export function instanceOfBillingMeterResponseData(
  value: object,
): value is BillingMeterResponseData {
  if (!("dispalyName" in value) || value["dispalyName"] === undefined)
    return false;
  if (!("eventName" in value) || value["eventName"] === undefined) return false;
  if (!("eventPayloadKey" in value) || value["eventPayloadKey"] === undefined)
    return false;
  if (!("externalPriceId" in value) || value["externalPriceId"] === undefined)
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  return true;
}

export function BillingMeterResponseDataFromJSON(
  json: any,
): BillingMeterResponseData {
  return BillingMeterResponseDataFromJSONTyped(json, false);
}

export function BillingMeterResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingMeterResponseData {
  if (json == null) {
    return json;
  }
  return {
    dispalyName: json["dispaly_name"],
    eventName: json["event_name"],
    eventPayloadKey: json["event_payload_key"],
    externalPriceId: json["external_price_id"],
    id: json["id"],
  };
}

export function BillingMeterResponseDataToJSON(
  json: any,
): BillingMeterResponseData {
  return BillingMeterResponseDataToJSONTyped(json, false);
}

export function BillingMeterResponseDataToJSONTyped(
  value?: BillingMeterResponseData | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    dispaly_name: value["dispalyName"],
    event_name: value["eventName"],
    event_payload_key: value["eventPayloadKey"],
    external_price_id: value["externalPriceId"],
    id: value["id"],
  };
}
