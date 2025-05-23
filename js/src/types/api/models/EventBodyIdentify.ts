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
import type { EventBodyIdentifyCompany } from "./EventBodyIdentifyCompany";
import {
  EventBodyIdentifyCompanyFromJSON,
  EventBodyIdentifyCompanyFromJSONTyped,
  EventBodyIdentifyCompanyToJSON,
  EventBodyIdentifyCompanyToJSONTyped,
} from "./EventBodyIdentifyCompany";

/**
 *
 * @export
 * @interface EventBodyIdentify
 */
export interface EventBodyIdentify {
  /**
   *
   * @type {EventBodyIdentifyCompany}
   * @memberof EventBodyIdentify
   */
  company?: EventBodyIdentifyCompany;
  /**
   * Key-value pairs to identify the user
   * @type {{ [key: string]: string; }}
   * @memberof EventBodyIdentify
   */
  keys: { [key: string]: string };
  /**
   * The display name of the user being identified; required only if it is a new user
   * @type {string}
   * @memberof EventBodyIdentify
   */
  name?: string;
  /**
   * A map of trait names to trait values
   * @type {object}
   * @memberof EventBodyIdentify
   */
  traits?: object;
}

/**
 * Check if a given object implements the EventBodyIdentify interface.
 */
export function instanceOfEventBodyIdentify(
  value: object,
): value is EventBodyIdentify {
  if (!("keys" in value) || value["keys"] === undefined) return false;
  return true;
}

export function EventBodyIdentifyFromJSON(json: any): EventBodyIdentify {
  return EventBodyIdentifyFromJSONTyped(json, false);
}

export function EventBodyIdentifyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): EventBodyIdentify {
  if (json == null) {
    return json;
  }
  return {
    company:
      json["company"] == null
        ? undefined
        : EventBodyIdentifyCompanyFromJSON(json["company"]),
    keys: json["keys"],
    name: json["name"] == null ? undefined : json["name"],
    traits: json["traits"] == null ? undefined : json["traits"],
  };
}

export function EventBodyIdentifyToJSON(json: any): EventBodyIdentify {
  return EventBodyIdentifyToJSONTyped(json, false);
}

export function EventBodyIdentifyToJSONTyped(
  value?: EventBodyIdentify | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    company: EventBodyIdentifyCompanyToJSON(value["company"]),
    keys: value["keys"],
    name: value["name"],
    traits: value["traits"],
  };
}
