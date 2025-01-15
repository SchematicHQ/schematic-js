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
 * @interface CreateFlagRequestBody
 */
export interface CreateFlagRequestBody {
  /**
   *
   * @type {boolean}
   * @memberof CreateFlagRequestBody
   */
  defaultValue: boolean;
  /**
   *
   * @type {string}
   * @memberof CreateFlagRequestBody
   */
  description: string;
  /**
   *
   * @type {string}
   * @memberof CreateFlagRequestBody
   */
  featureId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateFlagRequestBody
   */
  flagType: string;
  /**
   *
   * @type {string}
   * @memberof CreateFlagRequestBody
   */
  key: string;
  /**
   *
   * @type {string}
   * @memberof CreateFlagRequestBody
   */
  maintainerId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateFlagRequestBody
   */
  name: string;
}

/**
 * Check if a given object implements the CreateFlagRequestBody interface.
 */
export function instanceOfCreateFlagRequestBody(
  value: object,
): value is CreateFlagRequestBody {
  if (!("defaultValue" in value) || value["defaultValue"] === undefined)
    return false;
  if (!("description" in value) || value["description"] === undefined)
    return false;
  if (!("flagType" in value) || value["flagType"] === undefined) return false;
  if (!("key" in value) || value["key"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  return true;
}

export function CreateFlagRequestBodyFromJSON(
  json: any,
): CreateFlagRequestBody {
  return CreateFlagRequestBodyFromJSONTyped(json, false);
}

export function CreateFlagRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateFlagRequestBody {
  if (json == null) {
    return json;
  }
  return {
    defaultValue: json["default_value"],
    description: json["description"],
    featureId: json["feature_id"] == null ? undefined : json["feature_id"],
    flagType: json["flag_type"],
    key: json["key"],
    maintainerId:
      json["maintainer_id"] == null ? undefined : json["maintainer_id"],
    name: json["name"],
  };
}

export function CreateFlagRequestBodyToJSON(json: any): CreateFlagRequestBody {
  return CreateFlagRequestBodyToJSONTyped(json, false);
}

export function CreateFlagRequestBodyToJSONTyped(
  value?: CreateFlagRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    default_value: value["defaultValue"],
    description: value["description"],
    feature_id: value["featureId"],
    flag_type: value["flagType"],
    key: value["key"],
    maintainer_id: value["maintainerId"],
    name: value["name"],
  };
}
