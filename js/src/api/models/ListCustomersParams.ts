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
 * @interface ListCustomersParams
 */
export interface ListCustomersParams {
  /**
   *
   * @type {boolean}
   * @memberof ListCustomersParams
   */
  failedToImport?: boolean;
  /**
   * Page limit (default 100)
   * @type {number}
   * @memberof ListCustomersParams
   */
  limit?: number;
  /**
   *
   * @type {string}
   * @memberof ListCustomersParams
   */
  name?: string;
  /**
   * Page offset (default 0)
   * @type {number}
   * @memberof ListCustomersParams
   */
  offset?: number;
  /**
   *
   * @type {string}
   * @memberof ListCustomersParams
   */
  q?: string;
}

/**
 * Check if a given object implements the ListCustomersParams interface.
 */
export function instanceOfListCustomersParams(
  value: object,
): value is ListCustomersParams {
  return true;
}

export function ListCustomersParamsFromJSON(json: any): ListCustomersParams {
  return ListCustomersParamsFromJSONTyped(json, false);
}

export function ListCustomersParamsFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ListCustomersParams {
  if (json == null) {
    return json;
  }
  return {
    failedToImport:
      json["failed_to_import"] == null ? undefined : json["failed_to_import"],
    limit: json["limit"] == null ? undefined : json["limit"],
    name: json["name"] == null ? undefined : json["name"],
    offset: json["offset"] == null ? undefined : json["offset"],
    q: json["q"] == null ? undefined : json["q"],
  };
}

export function ListCustomersParamsToJSON(json: any): ListCustomersParams {
  return ListCustomersParamsToJSONTyped(json, false);
}

export function ListCustomersParamsToJSONTyped(
  value?: ListCustomersParams | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    failed_to_import: value["failedToImport"],
    limit: value["limit"],
    name: value["name"],
    offset: value["offset"],
    q: value["q"],
  };
}
