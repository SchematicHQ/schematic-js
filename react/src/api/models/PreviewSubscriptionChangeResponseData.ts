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
 * The created resource
 * @export
 * @interface PreviewSubscriptionChangeResponseData
 */
export interface PreviewSubscriptionChangeResponseData {
  /**
   *
   * @type {number}
   * @memberof PreviewSubscriptionChangeResponseData
   */
  dueNow: number;
  /**
   *
   * @type {number}
   * @memberof PreviewSubscriptionChangeResponseData
   */
  newCharges: number;
  /**
   *
   * @type {number}
   * @memberof PreviewSubscriptionChangeResponseData
   */
  proration: number;
}

/**
 * Check if a given object implements the PreviewSubscriptionChangeResponseData interface.
 */
export function instanceOfPreviewSubscriptionChangeResponseData(
  value: object,
): value is PreviewSubscriptionChangeResponseData {
  if (!("dueNow" in value) || value["dueNow"] === undefined) return false;
  if (!("newCharges" in value) || value["newCharges"] === undefined)
    return false;
  if (!("proration" in value) || value["proration"] === undefined) return false;
  return true;
}

export function PreviewSubscriptionChangeResponseDataFromJSON(
  json: any,
): PreviewSubscriptionChangeResponseData {
  return PreviewSubscriptionChangeResponseDataFromJSONTyped(json, false);
}

export function PreviewSubscriptionChangeResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PreviewSubscriptionChangeResponseData {
  if (json == null) {
    return json;
  }
  return {
    dueNow: json["due_now"],
    newCharges: json["new_charges"],
    proration: json["proration"],
  };
}

export function PreviewSubscriptionChangeResponseDataToJSON(
  value?: PreviewSubscriptionChangeResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    due_now: value["dueNow"],
    new_charges: value["newCharges"],
    proration: value["proration"],
  };
}
