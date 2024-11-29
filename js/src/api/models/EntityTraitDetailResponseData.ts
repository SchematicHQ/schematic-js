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
import type { EntityTraitDefinitionResponseData } from "./EntityTraitDefinitionResponseData";
import {
  EntityTraitDefinitionResponseDataFromJSON,
  EntityTraitDefinitionResponseDataFromJSONTyped,
  EntityTraitDefinitionResponseDataToJSON,
  EntityTraitDefinitionResponseDataToJSONTyped,
} from "./EntityTraitDefinitionResponseData";

/**
 *
 * @export
 * @interface EntityTraitDetailResponseData
 */
export interface EntityTraitDetailResponseData {
  /**
   *
   * @type {Date}
   * @memberof EntityTraitDetailResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {EntityTraitDefinitionResponseData}
   * @memberof EntityTraitDetailResponseData
   */
  definition?: EntityTraitDefinitionResponseData;
  /**
   *
   * @type {string}
   * @memberof EntityTraitDetailResponseData
   */
  definitionId: string;
  /**
   *
   * @type {string}
   * @memberof EntityTraitDetailResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof EntityTraitDetailResponseData
   */
  id: string;
  /**
   *
   * @type {Date}
   * @memberof EntityTraitDetailResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {string}
   * @memberof EntityTraitDetailResponseData
   */
  value: string;
}

/**
 * Check if a given object implements the EntityTraitDetailResponseData interface.
 */
export function instanceOfEntityTraitDetailResponseData(
  value: object,
): value is EntityTraitDetailResponseData {
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("definitionId" in value) || value["definitionId"] === undefined)
    return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  if (!("value" in value) || value["value"] === undefined) return false;
  return true;
}

export function EntityTraitDetailResponseDataFromJSON(
  json: any,
): EntityTraitDetailResponseData {
  return EntityTraitDetailResponseDataFromJSONTyped(json, false);
}

export function EntityTraitDetailResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): EntityTraitDetailResponseData {
  if (json == null) {
    return json;
  }
  return {
    createdAt: new Date(json["created_at"]),
    definition:
      json["definition"] == null
        ? undefined
        : EntityTraitDefinitionResponseDataFromJSON(json["definition"]),
    definitionId: json["definition_id"],
    environmentId: json["environment_id"],
    id: json["id"],
    updatedAt: new Date(json["updated_at"]),
    value: json["value"],
  };
}

export function EntityTraitDetailResponseDataToJSON(
  json: any,
): EntityTraitDetailResponseData {
  return EntityTraitDetailResponseDataToJSONTyped(json, false);
}

export function EntityTraitDetailResponseDataToJSONTyped(
  value?: EntityTraitDetailResponseData | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    created_at: value["createdAt"].toISOString(),
    definition: EntityTraitDefinitionResponseDataToJSON(value["definition"]),
    definition_id: value["definitionId"],
    environment_id: value["environmentId"],
    id: value["id"],
    updated_at: value["updatedAt"].toISOString(),
    value: value["value"],
  };
}
