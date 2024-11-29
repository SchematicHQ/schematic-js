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
import type { EventBody } from "./EventBody";
import {
  EventBodyFromJSON,
  EventBodyFromJSONTyped,
  EventBodyToJSON,
  EventBodyToJSONTyped,
} from "./EventBody";

/**
 *
 * @export
 * @interface CreateEventRequestBody
 */
export interface CreateEventRequestBody {
  /**
   *
   * @type {EventBody}
   * @memberof CreateEventRequestBody
   */
  body?: EventBody;
  /**
   * Either 'identify' or 'track'
   * @type {string}
   * @memberof CreateEventRequestBody
   */
  eventType: CreateEventRequestBodyEventTypeEnum;
  /**
   * Optionally provide a timestamp at which the event was sent to Schematic
   * @type {Date}
   * @memberof CreateEventRequestBody
   */
  sentAt?: Date | null;
}

/**
 * @export
 */
export const CreateEventRequestBodyEventTypeEnum = {
  Identify: "identify",
  Track: "track",
  FlagCheck: "flag_check",
} as const;
export type CreateEventRequestBodyEventTypeEnum =
  (typeof CreateEventRequestBodyEventTypeEnum)[keyof typeof CreateEventRequestBodyEventTypeEnum];

/**
 * Check if a given object implements the CreateEventRequestBody interface.
 */
export function instanceOfCreateEventRequestBody(
  value: object,
): value is CreateEventRequestBody {
  if (!("eventType" in value) || value["eventType"] === undefined) return false;
  return true;
}

export function CreateEventRequestBodyFromJSON(
  json: any,
): CreateEventRequestBody {
  return CreateEventRequestBodyFromJSONTyped(json, false);
}

export function CreateEventRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateEventRequestBody {
  if (json == null) {
    return json;
  }
  return {
    body: json["body"] == null ? undefined : EventBodyFromJSON(json["body"]),
    eventType: json["event_type"],
    sentAt: json["sent_at"] == null ? undefined : new Date(json["sent_at"]),
  };
}

export function CreateEventRequestBodyToJSON(
  json: any,
): CreateEventRequestBody {
  return CreateEventRequestBodyToJSONTyped(json, false);
}

export function CreateEventRequestBodyToJSONTyped(
  value?: CreateEventRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    body: EventBodyToJSON(value["body"]),
    event_type: value["eventType"],
    sent_at:
      value["sentAt"] == null
        ? undefined
        : (value["sentAt"] as any).toISOString(),
  };
}
