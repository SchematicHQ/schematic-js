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
import type { GetActiveCompanySubscriptionParams } from "./GetActiveCompanySubscriptionParams";
import {
  GetActiveCompanySubscriptionParamsFromJSON,
  GetActiveCompanySubscriptionParamsFromJSONTyped,
  GetActiveCompanySubscriptionParamsToJSON,
  GetActiveCompanySubscriptionParamsToJSONTyped,
} from "./GetActiveCompanySubscriptionParams";
import type { CompanySubscriptionResponseData } from "./CompanySubscriptionResponseData";
import {
  CompanySubscriptionResponseDataFromJSON,
  CompanySubscriptionResponseDataFromJSONTyped,
  CompanySubscriptionResponseDataToJSON,
  CompanySubscriptionResponseDataToJSONTyped,
} from "./CompanySubscriptionResponseData";

/**
 *
 * @export
 * @interface GetActiveCompanySubscriptionResponse
 */
export interface GetActiveCompanySubscriptionResponse {
  /**
   * The returned resources
   * @type {Array<CompanySubscriptionResponseData>}
   * @memberof GetActiveCompanySubscriptionResponse
   */
  data: Array<CompanySubscriptionResponseData>;
  /**
   *
   * @type {GetActiveCompanySubscriptionParams}
   * @memberof GetActiveCompanySubscriptionResponse
   */
  params: GetActiveCompanySubscriptionParams;
}

/**
 * Check if a given object implements the GetActiveCompanySubscriptionResponse interface.
 */
export function instanceOfGetActiveCompanySubscriptionResponse(
  value: object,
): value is GetActiveCompanySubscriptionResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function GetActiveCompanySubscriptionResponseFromJSON(
  json: any,
): GetActiveCompanySubscriptionResponse {
  return GetActiveCompanySubscriptionResponseFromJSONTyped(json, false);
}

export function GetActiveCompanySubscriptionResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): GetActiveCompanySubscriptionResponse {
  if (json == null) {
    return json;
  }
  return {
    data: (json["data"] as Array<any>).map(
      CompanySubscriptionResponseDataFromJSON,
    ),
    params: GetActiveCompanySubscriptionParamsFromJSON(json["params"]),
  };
}

export function GetActiveCompanySubscriptionResponseToJSON(
  json: any,
): GetActiveCompanySubscriptionResponse {
  return GetActiveCompanySubscriptionResponseToJSONTyped(json, false);
}

export function GetActiveCompanySubscriptionResponseToJSONTyped(
  value?: GetActiveCompanySubscriptionResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: (value["data"] as Array<any>).map(
      CompanySubscriptionResponseDataToJSON,
    ),
    params: GetActiveCompanySubscriptionParamsToJSON(value["params"]),
  };
}
