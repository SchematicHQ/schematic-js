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
 * @interface FeatureResponseData
 */
export interface FeatureResponseData {
  /**
   *
   * @type {Date}
   * @memberof FeatureResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  description: string;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  eventSubtype?: string | null;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  featureType: string;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  icon: string;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  lifecyclePhase?: string | null;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  maintainerId?: string | null;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  name: string;
  /**
   *
   * @type {string}
   * @memberof FeatureResponseData
   */
  traitId?: string | null;
  /**
   *
   * @type {Date}
   * @memberof FeatureResponseData
   */
  updatedAt: Date;
}

/**
 * Check if a given object implements the FeatureResponseData interface.
 */
export function instanceOfFeatureResponseData(
  value: object,
): value is FeatureResponseData {
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("description" in value) || value["description"] === undefined)
    return false;
  if (!("featureType" in value) || value["featureType"] === undefined)
    return false;
  if (!("icon" in value) || value["icon"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  return true;
}

export function FeatureResponseDataFromJSON(json: any): FeatureResponseData {
  return FeatureResponseDataFromJSONTyped(json, false);
}

export function FeatureResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): FeatureResponseData {
  if (json == null) {
    return json;
  }
  return {
    createdAt: new Date(json["created_at"]),
    description: json["description"],
    eventSubtype:
      json["event_subtype"] == null ? undefined : json["event_subtype"],
    featureType: json["feature_type"],
    icon: json["icon"],
    id: json["id"],
    lifecyclePhase:
      json["lifecycle_phase"] == null ? undefined : json["lifecycle_phase"],
    maintainerId:
      json["maintainer_id"] == null ? undefined : json["maintainer_id"],
    name: json["name"],
    traitId: json["trait_id"] == null ? undefined : json["trait_id"],
    updatedAt: new Date(json["updated_at"]),
  };
}

export function FeatureResponseDataToJSON(
  value?: FeatureResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    created_at: value["createdAt"].toISOString(),
    description: value["description"],
    event_subtype: value["eventSubtype"],
    feature_type: value["featureType"],
    icon: value["icon"],
    id: value["id"],
    lifecycle_phase: value["lifecyclePhase"],
    maintainer_id: value["maintainerId"],
    name: value["name"],
    trait_id: value["traitId"],
    updated_at: value["updatedAt"].toISOString(),
  };
}
