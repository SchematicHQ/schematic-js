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
 * Input parameters
 * @export
 * @interface CountWebhookEventsParams
 */
export interface CountWebhookEventsParams {
  /**
   *
   * @type {Array<string>}
   * @memberof CountWebhookEventsParams
   */
  ids?: Array<string>;
  /**
   * Page limit (default 100)
   * @type {number}
   * @memberof CountWebhookEventsParams
   */
  limit?: number;
  /**
   * Page offset (default 0)
   * @type {number}
   * @memberof CountWebhookEventsParams
   */
  offset?: number;
  /**
   *
   * @type {string}
   * @memberof CountWebhookEventsParams
   */
  q?: string;
  /**
   *
   * @type {string}
   * @memberof CountWebhookEventsParams
   */
  webhookId?: string;
}

/**
 * Check if a given object implements the CountWebhookEventsParams interface.
 */
export function instanceOfCountWebhookEventsParams(
  value: object,
): value is CountWebhookEventsParams {
  return true;
}

export function CountWebhookEventsParamsFromJSON(
  json: any,
): CountWebhookEventsParams {
  return CountWebhookEventsParamsFromJSONTyped(json, false);
}

export function CountWebhookEventsParamsFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CountWebhookEventsParams {
  if (json == null) {
    return json;
  }
  return {
    ids: json["ids"] == null ? undefined : json["ids"],
    limit: json["limit"] == null ? undefined : json["limit"],
    offset: json["offset"] == null ? undefined : json["offset"],
    q: json["q"] == null ? undefined : json["q"],
    webhookId: json["webhook_id"] == null ? undefined : json["webhook_id"],
  };
}

export function CountWebhookEventsParamsToJSON(
  json: any,
): CountWebhookEventsParams {
  return CountWebhookEventsParamsToJSONTyped(json, false);
}

export function CountWebhookEventsParamsToJSONTyped(
  value?: CountWebhookEventsParams | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    ids: value["ids"],
    limit: value["limit"],
    offset: value["offset"],
    q: value["q"],
    webhook_id: value["webhookId"],
  };
}
