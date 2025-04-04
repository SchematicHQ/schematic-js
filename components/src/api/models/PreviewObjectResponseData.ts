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
 * @interface PreviewObjectResponseData
 */
export interface PreviewObjectResponseData {
  /**
   *
   * @type {string}
   * @memberof PreviewObjectResponseData
   */
  description?: string | null;
  /**
   *
   * @type {string}
   * @memberof PreviewObjectResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof PreviewObjectResponseData
   */
  imageUrl?: string | null;
  /**
   *
   * @type {string}
   * @memberof PreviewObjectResponseData
   */
  name: string;
}

/**
 * Check if a given object implements the PreviewObjectResponseData interface.
 */
export function instanceOfPreviewObjectResponseData(
  value: object,
): value is PreviewObjectResponseData {
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  return true;
}

export function PreviewObjectResponseDataFromJSON(
  json: any,
): PreviewObjectResponseData {
  return PreviewObjectResponseDataFromJSONTyped(json, false);
}

export function PreviewObjectResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PreviewObjectResponseData {
  if (json == null) {
    return json;
  }
  return {
    description: json["description"] == null ? undefined : json["description"],
    id: json["id"],
    imageUrl: json["image_url"] == null ? undefined : json["image_url"],
    name: json["name"],
  };
}

export function PreviewObjectResponseDataToJSON(
  value?: PreviewObjectResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    description: value["description"],
    id: value["id"],
    image_url: value["imageUrl"],
    name: value["name"],
  };
}
