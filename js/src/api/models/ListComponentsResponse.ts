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
import type { ComponentResponseData } from "./ComponentResponseData";
import {
  ComponentResponseDataFromJSON,
  ComponentResponseDataFromJSONTyped,
  ComponentResponseDataToJSON,
  ComponentResponseDataToJSONTyped,
} from "./ComponentResponseData";
import type { ListComponentsParams } from "./ListComponentsParams";
import {
  ListComponentsParamsFromJSON,
  ListComponentsParamsFromJSONTyped,
  ListComponentsParamsToJSON,
  ListComponentsParamsToJSONTyped,
} from "./ListComponentsParams";

/**
 *
 * @export
 * @interface ListComponentsResponse
 */
export interface ListComponentsResponse {
  /**
   * The returned resources
   * @type {Array<ComponentResponseData>}
   * @memberof ListComponentsResponse
   */
  data: Array<ComponentResponseData>;
  /**
   *
   * @type {ListComponentsParams}
   * @memberof ListComponentsResponse
   */
  params: ListComponentsParams;
}

/**
 * Check if a given object implements the ListComponentsResponse interface.
 */
export function instanceOfListComponentsResponse(
  value: object,
): value is ListComponentsResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function ListComponentsResponseFromJSON(
  json: any,
): ListComponentsResponse {
  return ListComponentsResponseFromJSONTyped(json, false);
}

export function ListComponentsResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ListComponentsResponse {
  if (json == null) {
    return json;
  }
  return {
    data: (json["data"] as Array<any>).map(ComponentResponseDataFromJSON),
    params: ListComponentsParamsFromJSON(json["params"]),
  };
}

export function ListComponentsResponseToJSON(
  json: any,
): ListComponentsResponse {
  return ListComponentsResponseToJSONTyped(json, false);
}

export function ListComponentsResponseToJSONTyped(
  value?: ListComponentsResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: (value["data"] as Array<any>).map(ComponentResponseDataToJSON),
    params: ListComponentsParamsToJSON(value["params"]),
  };
}
