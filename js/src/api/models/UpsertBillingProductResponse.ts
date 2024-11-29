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
import type { BillingProductResponseData } from "./BillingProductResponseData";
import {
  BillingProductResponseDataFromJSON,
  BillingProductResponseDataFromJSONTyped,
  BillingProductResponseDataToJSON,
  BillingProductResponseDataToJSONTyped,
} from "./BillingProductResponseData";

/**
 *
 * @export
 * @interface UpsertBillingProductResponse
 */
export interface UpsertBillingProductResponse {
  /**
   *
   * @type {BillingProductResponseData}
   * @memberof UpsertBillingProductResponse
   */
  data: BillingProductResponseData;
  /**
   * Input parameters
   * @type {object}
   * @memberof UpsertBillingProductResponse
   */
  params: object;
}

/**
 * Check if a given object implements the UpsertBillingProductResponse interface.
 */
export function instanceOfUpsertBillingProductResponse(
  value: object,
): value is UpsertBillingProductResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function UpsertBillingProductResponseFromJSON(
  json: any,
): UpsertBillingProductResponse {
  return UpsertBillingProductResponseFromJSONTyped(json, false);
}

export function UpsertBillingProductResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): UpsertBillingProductResponse {
  if (json == null) {
    return json;
  }
  return {
    data: BillingProductResponseDataFromJSON(json["data"]),
    params: json["params"],
  };
}

export function UpsertBillingProductResponseToJSON(
  json: any,
): UpsertBillingProductResponse {
  return UpsertBillingProductResponseToJSONTyped(json, false);
}

export function UpsertBillingProductResponseToJSONTyped(
  value?: UpsertBillingProductResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: BillingProductResponseDataToJSON(value["data"]),
    params: value["params"],
  };
}
