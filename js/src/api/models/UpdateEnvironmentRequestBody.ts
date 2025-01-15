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
 * @interface UpdateEnvironmentRequestBody
 */
export interface UpdateEnvironmentRequestBody {
  /**
   *
   * @type {string}
   * @memberof UpdateEnvironmentRequestBody
   */
  environmentType?: UpdateEnvironmentRequestBodyEnvironmentTypeEnum | null;
  /**
   *
   * @type {string}
   * @memberof UpdateEnvironmentRequestBody
   */
  name?: string | null;
}

/**
 * @export
 */
export const UpdateEnvironmentRequestBodyEnvironmentTypeEnum = {
  Development: "development",
  Staging: "staging",
  Production: "production",
} as const;
export type UpdateEnvironmentRequestBodyEnvironmentTypeEnum =
  (typeof UpdateEnvironmentRequestBodyEnvironmentTypeEnum)[keyof typeof UpdateEnvironmentRequestBodyEnvironmentTypeEnum];

/**
 * Check if a given object implements the UpdateEnvironmentRequestBody interface.
 */
export function instanceOfUpdateEnvironmentRequestBody(
  value: object,
): value is UpdateEnvironmentRequestBody {
  return true;
}

export function UpdateEnvironmentRequestBodyFromJSON(
  json: any,
): UpdateEnvironmentRequestBody {
  return UpdateEnvironmentRequestBodyFromJSONTyped(json, false);
}

export function UpdateEnvironmentRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): UpdateEnvironmentRequestBody {
  if (json == null) {
    return json;
  }
  return {
    environmentType:
      json["environment_type"] == null ? undefined : json["environment_type"],
    name: json["name"] == null ? undefined : json["name"],
  };
}

export function UpdateEnvironmentRequestBodyToJSON(
  json: any,
): UpdateEnvironmentRequestBody {
  return UpdateEnvironmentRequestBodyToJSONTyped(json, false);
}

export function UpdateEnvironmentRequestBodyToJSONTyped(
  value?: UpdateEnvironmentRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    environment_type: value["environmentType"],
    name: value["name"],
  };
}
