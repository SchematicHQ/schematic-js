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
import type { WebhookResponseData } from "./WebhookResponseData";
import {
  WebhookResponseDataFromJSON,
  WebhookResponseDataFromJSONTyped,
  WebhookResponseDataToJSON,
  WebhookResponseDataToJSONTyped,
} from "./WebhookResponseData";

/**
 *
 * @export
 * @interface UpdateWebhookResponse
 */
export interface UpdateWebhookResponse {
  /**
   *
   * @type {WebhookResponseData}
   * @memberof UpdateWebhookResponse
   */
  data: WebhookResponseData;
  /**
   * Input parameters
   * @type {object}
   * @memberof UpdateWebhookResponse
   */
  params: object;
}

/**
 * Check if a given object implements the UpdateWebhookResponse interface.
 */
export function instanceOfUpdateWebhookResponse(
  value: object,
): value is UpdateWebhookResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function UpdateWebhookResponseFromJSON(
  json: any,
): UpdateWebhookResponse {
  return UpdateWebhookResponseFromJSONTyped(json, false);
}

export function UpdateWebhookResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): UpdateWebhookResponse {
  if (json == null) {
    return json;
  }
  return {
    data: WebhookResponseDataFromJSON(json["data"]),
    params: json["params"],
  };
}

export function UpdateWebhookResponseToJSON(json: any): UpdateWebhookResponse {
  return UpdateWebhookResponseToJSONTyped(json, false);
}

export function UpdateWebhookResponseToJSONTyped(
  value?: UpdateWebhookResponse | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    data: WebhookResponseDataToJSON(value["data"]),
    params: value["params"],
  };
}
