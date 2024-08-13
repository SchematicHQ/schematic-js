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
 * @interface ChangeSubscriptionRequestBody
 */
export interface ChangeSubscriptionRequestBody {
  /**
   *
   * @type {string}
   * @memberof ChangeSubscriptionRequestBody
   */
  action: string;
  /**
   *
   * @type {string}
   * @memberof ChangeSubscriptionRequestBody
   */
  newPlanId: string;
  /**
   *
   * @type {string}
   * @memberof ChangeSubscriptionRequestBody
   */
  newPriceId: string;
}

/**
 * Check if a given object implements the ChangeSubscriptionRequestBody interface.
 */
export function instanceOfChangeSubscriptionRequestBody(
  value: object,
): value is ChangeSubscriptionRequestBody {
  if (!("action" in value) || value["action"] === undefined) return false;
  if (!("newPlanId" in value) || value["newPlanId"] === undefined) return false;
  if (!("newPriceId" in value) || value["newPriceId"] === undefined)
    return false;
  return true;
}

export function ChangeSubscriptionRequestBodyFromJSON(
  json: any,
): ChangeSubscriptionRequestBody {
  return ChangeSubscriptionRequestBodyFromJSONTyped(json, false);
}

export function ChangeSubscriptionRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ChangeSubscriptionRequestBody {
  if (json == null) {
    return json;
  }
  return {
    action: json["action"],
    newPlanId: json["new_plan_id"],
    newPriceId: json["new_price_id"],
  };
}

export function ChangeSubscriptionRequestBodyToJSON(
  value?: ChangeSubscriptionRequestBody | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    action: value["action"],
    new_plan_id: value["newPlanId"],
    new_price_id: value["newPriceId"],
  };
}
