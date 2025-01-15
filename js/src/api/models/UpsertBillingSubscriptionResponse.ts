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
import type { BillingSubscriptionResponseData } from "./BillingSubscriptionResponseData";
import {
  BillingSubscriptionResponseDataFromJSON,
  BillingSubscriptionResponseDataFromJSONTyped,
  BillingSubscriptionResponseDataToJSON,
  BillingSubscriptionResponseDataToJSONTyped,
} from "./BillingSubscriptionResponseData";

/**
 *
 * @export
 * @interface UpsertBillingSubscriptionResponse
 */
export interface UpsertBillingSubscriptionResponse {
  /**
   *
   * @type {BillingSubscriptionResponseData}
   * @memberof UpsertBillingSubscriptionResponse
   */
  data: BillingSubscriptionResponseData;
  /**
   * Input parameters
   * @type {object}
   * @memberof UpsertBillingSubscriptionResponse
   */
  params: object;
}

/**
 * Check if a given object implements the UpsertBillingSubscriptionResponse interface.
 */
export function instanceOfUpsertBillingSubscriptionResponse(
  value: object,
): value is UpsertBillingSubscriptionResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function UpsertBillingSubscriptionResponseFromJSON(
  json: any,
): UpsertBillingSubscriptionResponse {
  return UpsertBillingSubscriptionResponseFromJSONTyped(json, false);
}

export function UpsertBillingSubscriptionResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): UpsertBillingSubscriptionResponse {
  if (json == null) {
    return json;
  }
  return {
    data: BillingSubscriptionResponseDataFromJSON(json["data"]),
    params: json["params"],
  };
}

export function UpsertBillingSubscriptionResponseToJSON(
  json: any,
): UpsertBillingSubscriptionResponse {
  return UpsertBillingSubscriptionResponseToJSONTyped(json, false);
}

export function UpsertBillingSubscriptionResponseToJSONTyped(
  value?: UpsertBillingSubscriptionResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: BillingSubscriptionResponseDataToJSON(value["data"]),
    params: value["params"],
  };
}
