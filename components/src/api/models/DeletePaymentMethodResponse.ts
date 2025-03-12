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
} from "./DeleteResponse";

/**
 *
 * @export
 * @interface DeletePaymentMethodResponse
 */
export interface DeletePaymentMethodResponse {
  /**
   *
   * @type {DeleteResponse}
   * @memberof DeletePaymentMethodResponse
   */
  data: DeleteResponse;
  /**
   * Input parameters
   * @type {object}
   * @memberof DeletePaymentMethodResponse
   */
  params: object;
}

/**
 * Check if a given object implements the DeletePaymentMethodResponse interface.
 */
export function instanceOfDeletePaymentMethodResponse(
  value: object,
): value is DeletePaymentMethodResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function DeletePaymentMethodResponseFromJSON(
  json: any,
): DeletePaymentMethodResponse {
  return DeletePaymentMethodResponseFromJSONTyped(json, false);
}

export function DeletePaymentMethodResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): DeletePaymentMethodResponse {
  if (json == null) {
    return json;
  }
  return {
    data: DeleteResponseFromJSON(json["data"]),
    params: json["params"],
  };
}

export function DeletePaymentMethodResponseToJSON(
  value?: DeletePaymentMethodResponse | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    data: DeleteResponseToJSON(value["data"]),
    params: value["params"],
  };
}
