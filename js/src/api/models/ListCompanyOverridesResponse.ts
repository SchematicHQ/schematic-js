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
import type { ListCompanyOverridesParams } from "./ListCompanyOverridesParams";
import {
  ListCompanyOverridesParamsFromJSON,
  ListCompanyOverridesParamsFromJSONTyped,
  ListCompanyOverridesParamsToJSON,
  ListCompanyOverridesParamsToJSONTyped,
} from "./ListCompanyOverridesParams";
import type { CompanyOverrideResponseData } from "./CompanyOverrideResponseData";
import {
  CompanyOverrideResponseDataFromJSON,
  CompanyOverrideResponseDataFromJSONTyped,
  CompanyOverrideResponseDataToJSON,
  CompanyOverrideResponseDataToJSONTyped,
} from "./CompanyOverrideResponseData";

/**
 *
 * @export
 * @interface ListCompanyOverridesResponse
 */
export interface ListCompanyOverridesResponse {
  /**
   * The returned resources
   * @type {Array<CompanyOverrideResponseData>}
   * @memberof ListCompanyOverridesResponse
   */
  data: Array<CompanyOverrideResponseData>;
  /**
   *
   * @type {ListCompanyOverridesParams}
   * @memberof ListCompanyOverridesResponse
   */
  params: ListCompanyOverridesParams;
}

/**
 * Check if a given object implements the ListCompanyOverridesResponse interface.
 */
export function instanceOfListCompanyOverridesResponse(
  value: object,
): value is ListCompanyOverridesResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function ListCompanyOverridesResponseFromJSON(
  json: any,
): ListCompanyOverridesResponse {
  return ListCompanyOverridesResponseFromJSONTyped(json, false);
}

export function ListCompanyOverridesResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ListCompanyOverridesResponse {
  if (json == null) {
    return json;
  }
  return {
    data: (json["data"] as Array<any>).map(CompanyOverrideResponseDataFromJSON),
    params: ListCompanyOverridesParamsFromJSON(json["params"]),
  };
}

export function ListCompanyOverridesResponseToJSON(
  json: any,
): ListCompanyOverridesResponse {
  return ListCompanyOverridesResponseToJSONTyped(json, false);
}

export function ListCompanyOverridesResponseToJSONTyped(
  value?: ListCompanyOverridesResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: (value["data"] as Array<any>).map(CompanyOverrideResponseDataToJSON),
    params: ListCompanyOverridesParamsToJSON(value["params"]),
  };
}
