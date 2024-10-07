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
 *
 * @export
 * @interface UpdatePaymentMethodRequestBody
 */
export interface UpdatePaymentMethodRequestBody {
  /**
   *
   * @type {string}
   * @memberof UpdatePaymentMethodRequestBody
   */
  paymentMethodId: string;
}

/**
 * Check if a given object implements the UpdatePaymentMethodRequestBody interface.
 */
export function instanceOfUpdatePaymentMethodRequestBody(
  value: object,
): value is UpdatePaymentMethodRequestBody {
  if (!("paymentMethodId" in value) || value["paymentMethodId"] === undefined)
    return false;
  return true;
}

export function UpdatePaymentMethodRequestBodyFromJSON(
  json: any,
): UpdatePaymentMethodRequestBody {
  return UpdatePaymentMethodRequestBodyFromJSONTyped(json, false);
}

export function UpdatePaymentMethodRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): UpdatePaymentMethodRequestBody {
  if (json == null) {
    return json;
  }
  return {
    paymentMethodId: json["payment_method_id"],
  };
}

export function UpdatePaymentMethodRequestBodyToJSON(
  value?: UpdatePaymentMethodRequestBody | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    payment_method_id: value["paymentMethodId"],
  };
}
