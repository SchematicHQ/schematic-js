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
import type { EventDetailResponseData } from "./EventDetailResponseData";
import {
  EventDetailResponseDataFromJSON,
  EventDetailResponseDataFromJSONTyped,
  EventDetailResponseDataToJSON,
  EventDetailResponseDataToJSONTyped,
} from "./EventDetailResponseData";

/**
 *
 * @export
 * @interface GetEventResponse
 */
export interface GetEventResponse {
  /**
   *
   * @type {EventDetailResponseData}
   * @memberof GetEventResponse
   */
  data: EventDetailResponseData;
  /**
   * Input parameters
   * @type {object}
   * @memberof GetEventResponse
   */
  params: object;
}

/**
 * Check if a given object implements the GetEventResponse interface.
 */
export function instanceOfGetEventResponse(
  value: object,
): value is GetEventResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function GetEventResponseFromJSON(json: any): GetEventResponse {
  return GetEventResponseFromJSONTyped(json, false);
}

export function GetEventResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): GetEventResponse {
  if (json == null) {
    return json;
  }
  return {
    data: EventDetailResponseDataFromJSON(json["data"]),
    params: json["params"],
  };
}

export function GetEventResponseToJSON(json: any): GetEventResponse {
  return GetEventResponseToJSONTyped(json, false);
}

export function GetEventResponseToJSONTyped(
  value?: GetEventResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: EventDetailResponseDataToJSON(value["data"]),
    params: value["params"],
  };
}
