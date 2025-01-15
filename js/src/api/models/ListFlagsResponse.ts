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
import type { ListFlagsParams } from "./ListFlagsParams";
import {
  ListFlagsParamsFromJSON,
  ListFlagsParamsFromJSONTyped,
  ListFlagsParamsToJSON,
  ListFlagsParamsToJSONTyped,
} from "./ListFlagsParams";
import type { FlagDetailResponseData } from "./FlagDetailResponseData";
import {
  FlagDetailResponseDataFromJSON,
  FlagDetailResponseDataFromJSONTyped,
  FlagDetailResponseDataToJSON,
  FlagDetailResponseDataToJSONTyped,
} from "./FlagDetailResponseData";

/**
 *
 * @export
 * @interface ListFlagsResponse
 */
export interface ListFlagsResponse {
  /**
   * The returned resources
   * @type {Array<FlagDetailResponseData>}
   * @memberof ListFlagsResponse
   */
  data: Array<FlagDetailResponseData>;
  /**
   *
   * @type {ListFlagsParams}
   * @memberof ListFlagsResponse
   */
  params: ListFlagsParams;
}

/**
 * Check if a given object implements the ListFlagsResponse interface.
 */
export function instanceOfListFlagsResponse(
  value: object,
): value is ListFlagsResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function ListFlagsResponseFromJSON(json: any): ListFlagsResponse {
  return ListFlagsResponseFromJSONTyped(json, false);
}

export function ListFlagsResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ListFlagsResponse {
  if (json == null) {
    return json;
  }
  return {
    data: (json["data"] as Array<any>).map(FlagDetailResponseDataFromJSON),
    params: ListFlagsParamsFromJSON(json["params"]),
  };
}

export function ListFlagsResponseToJSON(json: any): ListFlagsResponse {
  return ListFlagsResponseToJSONTyped(json, false);
}

export function ListFlagsResponseToJSONTyped(
  value?: ListFlagsResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: (value["data"] as Array<any>).map(FlagDetailResponseDataToJSON),
    params: ListFlagsParamsToJSON(value["params"]),
  };
}
