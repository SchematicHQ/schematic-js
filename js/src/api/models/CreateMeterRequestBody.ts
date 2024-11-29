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
 * @interface CreateMeterRequestBody
 */
export interface CreateMeterRequestBody {
  /**
   *
   * @type {string}
   * @memberof CreateMeterRequestBody
   */
  displayName: string;
  /**
   *
   * @type {string}
   * @memberof CreateMeterRequestBody
   */
  eventName: string;
  /**
   *
   * @type {string}
   * @memberof CreateMeterRequestBody
   */
  eventPayloadKey: string;
  /**
   *
   * @type {string}
   * @memberof CreateMeterRequestBody
   */
  externalId: string;
}

/**
 * Check if a given object implements the CreateMeterRequestBody interface.
 */
export function instanceOfCreateMeterRequestBody(
  value: object,
): value is CreateMeterRequestBody {
  if (!("displayName" in value) || value["displayName"] === undefined)
    return false;
  if (!("eventName" in value) || value["eventName"] === undefined) return false;
  if (!("eventPayloadKey" in value) || value["eventPayloadKey"] === undefined)
    return false;
  if (!("externalId" in value) || value["externalId"] === undefined)
    return false;
  return true;
}

export function CreateMeterRequestBodyFromJSON(
  json: any,
): CreateMeterRequestBody {
  return CreateMeterRequestBodyFromJSONTyped(json, false);
}

export function CreateMeterRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateMeterRequestBody {
  if (json == null) {
    return json;
  }
  return {
    displayName: json["display_name"],
    eventName: json["event_name"],
    eventPayloadKey: json["event_payload_key"],
    externalId: json["external_id"],
  };
}

export function CreateMeterRequestBodyToJSON(
  json: any,
): CreateMeterRequestBody {
  return CreateMeterRequestBodyToJSONTyped(json, false);
}

export function CreateMeterRequestBodyToJSONTyped(
  value?: CreateMeterRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    display_name: value["displayName"],
    event_name: value["eventName"],
    event_payload_key: value["eventPayloadKey"],
    external_id: value["externalId"],
  };
}
