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
import type { UserDetailResponseData } from "./UserDetailResponseData";
import {
  UserDetailResponseDataFromJSON,
  UserDetailResponseDataFromJSONTyped,
  UserDetailResponseDataToJSON,
  UserDetailResponseDataToJSONTyped,
} from "./UserDetailResponseData";

/**
 *
 * @export
 * @interface UpsertUserResponse
 */
export interface UpsertUserResponse {
  /**
   *
   * @type {UserDetailResponseData}
   * @memberof UpsertUserResponse
   */
  data: UserDetailResponseData;
  /**
   * Input parameters
   * @type {object}
   * @memberof UpsertUserResponse
   */
  params: object;
}

/**
 * Check if a given object implements the UpsertUserResponse interface.
 */
export function instanceOfUpsertUserResponse(
  value: object,
): value is UpsertUserResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function UpsertUserResponseFromJSON(json: any): UpsertUserResponse {
  return UpsertUserResponseFromJSONTyped(json, false);
}

export function UpsertUserResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): UpsertUserResponse {
  if (json == null) {
    return json;
  }
  return {
    data: UserDetailResponseDataFromJSON(json["data"]),
    params: json["params"],
  };
}

export function UpsertUserResponseToJSON(json: any): UpsertUserResponse {
  return UpsertUserResponseToJSONTyped(json, false);
}

export function UpsertUserResponseToJSONTyped(
  value?: UpsertUserResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: UserDetailResponseDataToJSON(value["data"]),
    params: value["params"],
  };
}
