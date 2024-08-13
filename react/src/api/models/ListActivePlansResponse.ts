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
import type { CompanyPlanDetailResponseData } from "./CompanyPlanDetailResponseData";
import {
  CompanyPlanDetailResponseDataFromJSON,
  CompanyPlanDetailResponseDataFromJSONTyped,
  CompanyPlanDetailResponseDataToJSON,
} from "./CompanyPlanDetailResponseData";

/**
 *
 * @export
 * @interface ListActivePlansResponse
 */
export interface ListActivePlansResponse {
  /**
   * The returned resources
   * @type {Array<CompanyPlanDetailResponseData>}
   * @memberof ListActivePlansResponse
   */
  data: Array<CompanyPlanDetailResponseData>;
  /**
   * Input parameters
   * @type {object}
   * @memberof ListActivePlansResponse
   */
  params: object;
}

/**
 * Check if a given object implements the ListActivePlansResponse interface.
 */
export function instanceOfListActivePlansResponse(
  value: object,
): value is ListActivePlansResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function ListActivePlansResponseFromJSON(
  json: any,
): ListActivePlansResponse {
  return ListActivePlansResponseFromJSONTyped(json, false);
}

export function ListActivePlansResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ListActivePlansResponse {
  if (json == null) {
    return json;
  }
  return {
    data: (json["data"] as Array<any>).map(
      CompanyPlanDetailResponseDataFromJSON,
    ),
    params: json["params"],
  };
}

export function ListActivePlansResponseToJSON(
  value?: ListActivePlansResponse | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    data: (value["data"] as Array<any>).map(
      CompanyPlanDetailResponseDataToJSON,
    ),
    params: value["params"],
  };
}
