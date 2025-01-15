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
 * Input parameters
 * @export
 * @interface ListComponentsParams
 */
export interface ListComponentsParams {
  /**
   * Page limit (default 100)
   * @type {number}
   * @memberof ListComponentsParams
   */
  limit?: number;
  /**
   * Page offset (default 0)
   * @type {number}
   * @memberof ListComponentsParams
   */
  offset?: number;
  /**
   *
   * @type {string}
   * @memberof ListComponentsParams
   */
  q?: string;
}

/**
 * Check if a given object implements the ListComponentsParams interface.
 */
export function instanceOfListComponentsParams(
  value: object,
): value is ListComponentsParams {
  return true;
}

export function ListComponentsParamsFromJSON(json: any): ListComponentsParams {
  return ListComponentsParamsFromJSONTyped(json, false);
}

export function ListComponentsParamsFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ListComponentsParams {
  if (json == null) {
    return json;
  }
  return {
    limit: json["limit"] == null ? undefined : json["limit"],
    offset: json["offset"] == null ? undefined : json["offset"],
    q: json["q"] == null ? undefined : json["q"],
  };
}

export function ListComponentsParamsToJSON(json: any): ListComponentsParams {
  return ListComponentsParamsToJSONTyped(json, false);
}

export function ListComponentsParamsToJSONTyped(
  value?: ListComponentsParams | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    limit: value["limit"],
    offset: value["offset"],
    q: value["q"],
  };
}
