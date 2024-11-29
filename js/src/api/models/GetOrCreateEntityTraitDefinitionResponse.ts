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
 * @interface GetOrCreateEntityTraitDefinitionResponse
 */
export interface GetOrCreateEntityTraitDefinitionResponse {
  /**
   *
   * @type {EntityTraitDefinitionResponseData}
   * @memberof GetOrCreateEntityTraitDefinitionResponse
   */
  data: EntityTraitDefinitionResponseData;
  /**
   * Input parameters
   * @type {object}
   * @memberof GetOrCreateEntityTraitDefinitionResponse
   */
  params: object;
}

/**
 * Check if a given object implements the GetOrCreateEntityTraitDefinitionResponse interface.
 */
export function instanceOfGetOrCreateEntityTraitDefinitionResponse(
  value: object,
): value is GetOrCreateEntityTraitDefinitionResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function GetOrCreateEntityTraitDefinitionResponseFromJSON(
  json: any,
): GetOrCreateEntityTraitDefinitionResponse {
  return GetOrCreateEntityTraitDefinitionResponseFromJSONTyped(json, false);
}

export function GetOrCreateEntityTraitDefinitionResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): GetOrCreateEntityTraitDefinitionResponse {
  if (json == null) {
    return json;
  }
  return {
    data: EntityTraitDefinitionResponseDataFromJSON(json["data"]),
    params: json["params"],
  };
}

export function GetOrCreateEntityTraitDefinitionResponseToJSON(
  json: any,
): GetOrCreateEntityTraitDefinitionResponse {
  return GetOrCreateEntityTraitDefinitionResponseToJSONTyped(json, false);
}

export function GetOrCreateEntityTraitDefinitionResponseToJSONTyped(
  value?: GetOrCreateEntityTraitDefinitionResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: EntityTraitDefinitionResponseDataToJSON(value["data"]),
    params: value["params"],
  };
}
