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
import type { DeleteResponse } from "./DeleteResponse";
import {
  DeleteResponseFromJSON,
  DeleteResponseFromJSONTyped,
  DeleteResponseToJSON,
  DeleteResponseToJSONTyped,
} from "./DeleteResponse";

/**
 *
 * @export
 * @interface DeleteCompanyOverrideResponse
 */
export interface DeleteCompanyOverrideResponse {
  /**
   *
   * @type {DeleteResponse}
   * @memberof DeleteCompanyOverrideResponse
   */
  data: DeleteResponse;
  /**
   * Input parameters
   * @type {object}
   * @memberof DeleteCompanyOverrideResponse
   */
  params: object;
}

/**
 * Check if a given object implements the DeleteCompanyOverrideResponse interface.
 */
export function instanceOfDeleteCompanyOverrideResponse(
  value: object,
): value is DeleteCompanyOverrideResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function DeleteCompanyOverrideResponseFromJSON(
  json: any,
): DeleteCompanyOverrideResponse {
  return DeleteCompanyOverrideResponseFromJSONTyped(json, false);
}

export function DeleteCompanyOverrideResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): DeleteCompanyOverrideResponse {
  if (json == null) {
    return json;
  }
  return {
    data: DeleteResponseFromJSON(json["data"]),
    params: json["params"],
  };
}

export function DeleteCompanyOverrideResponseToJSON(
  json: any,
): DeleteCompanyOverrideResponse {
  return DeleteCompanyOverrideResponseToJSONTyped(json, false);
}

export function DeleteCompanyOverrideResponseToJSONTyped(
  value?: DeleteCompanyOverrideResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: DeleteResponseToJSON(value["data"]),
    params: value["params"],
  };
}
