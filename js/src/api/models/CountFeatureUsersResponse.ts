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
import type { CountFeatureUsersParams } from "./CountFeatureUsersParams";
import {
  CountFeatureUsersParamsFromJSON,
  CountFeatureUsersParamsFromJSONTyped,
  CountFeatureUsersParamsToJSON,
  CountFeatureUsersParamsToJSONTyped,
} from "./CountFeatureUsersParams";
import type { CountResponse } from "./CountResponse";
import {
  CountResponseFromJSON,
  CountResponseFromJSONTyped,
  CountResponseToJSON,
  CountResponseToJSONTyped,
} from "./CountResponse";

/**
 *
 * @export
 * @interface CountFeatureUsersResponse
 */
export interface CountFeatureUsersResponse {
  /**
   *
   * @type {CountResponse}
   * @memberof CountFeatureUsersResponse
   */
  data: CountResponse;
  /**
   *
   * @type {CountFeatureUsersParams}
   * @memberof CountFeatureUsersResponse
   */
  params: CountFeatureUsersParams;
}

/**
 * Check if a given object implements the CountFeatureUsersResponse interface.
 */
export function instanceOfCountFeatureUsersResponse(
  value: object,
): value is CountFeatureUsersResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function CountFeatureUsersResponseFromJSON(
  json: any,
): CountFeatureUsersResponse {
  return CountFeatureUsersResponseFromJSONTyped(json, false);
}

export function CountFeatureUsersResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CountFeatureUsersResponse {
  if (json == null) {
    return json;
  }
  return {
    data: CountResponseFromJSON(json["data"]),
    params: CountFeatureUsersParamsFromJSON(json["params"]),
  };
}

export function CountFeatureUsersResponseToJSON(
  json: any,
): CountFeatureUsersResponse {
  return CountFeatureUsersResponseToJSONTyped(json, false);
}

export function CountFeatureUsersResponseToJSONTyped(
  value?: CountFeatureUsersResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: CountResponseToJSON(value["data"]),
    params: CountFeatureUsersParamsToJSON(value["params"]),
  };
}
