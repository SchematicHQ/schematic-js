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
 * @interface FlagResponseData
 */
export interface FlagResponseData {
  /**
   *
   * @type {Date}
   * @memberof FlagResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {boolean}
   * @memberof FlagResponseData
   */
  defaultValue: boolean;
  /**
   *
   * @type {string}
   * @memberof FlagResponseData
   */
  description: string;
  /**
   *
   * @type {string}
   * @memberof FlagResponseData
   */
  featureId?: string | null;
  /**
   *
   * @type {string}
   * @memberof FlagResponseData
   */
  flagType: string;
  /**
   *
   * @type {string}
   * @memberof FlagResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof FlagResponseData
   */
  key: string;
  /**
   *
   * @type {string}
   * @memberof FlagResponseData
   */
  maintainerId?: string | null;
  /**
   *
   * @type {string}
   * @memberof FlagResponseData
   */
  name: string;
  /**
   *
   * @type {Date}
   * @memberof FlagResponseData
   */
  updatedAt: Date;
}

/**
 * Check if a given object implements the FlagResponseData interface.
 */
export function instanceOfFlagResponseData(
  value: object,
): value is FlagResponseData {
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("defaultValue" in value) || value["defaultValue"] === undefined)
    return false;
  if (!("description" in value) || value["description"] === undefined)
    return false;
  if (!("flagType" in value) || value["flagType"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("key" in value) || value["key"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  return true;
}

export function FlagResponseDataFromJSON(json: any): FlagResponseData {
  return FlagResponseDataFromJSONTyped(json, false);
}

export function FlagResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): FlagResponseData {
  if (json == null) {
    return json;
  }
  return {
    createdAt: new Date(json["created_at"]),
    defaultValue: json["default_value"],
    description: json["description"],
    featureId: json["feature_id"] == null ? undefined : json["feature_id"],
    flagType: json["flag_type"],
    id: json["id"],
    key: json["key"],
    maintainerId:
      json["maintainer_id"] == null ? undefined : json["maintainer_id"],
    name: json["name"],
    updatedAt: new Date(json["updated_at"]),
  };
}

export function FlagResponseDataToJSON(value?: FlagResponseData | null): any {
  if (value == null) {
    return value;
  }
  return {
    created_at: value["createdAt"].toISOString(),
    default_value: value["defaultValue"],
    description: value["description"],
    feature_id: value["featureId"],
    flag_type: value["flagType"],
    id: value["id"],
    key: value["key"],
    maintainer_id: value["maintainerId"],
    name: value["name"],
    updated_at: value["updatedAt"].toISOString(),
  };
}
