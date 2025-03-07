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
 * @interface EventBodyFlagCheck
 */
export interface EventBodyFlagCheck {
  /**
   * Schematic company ID (starting with 'comp_') of the company evaluated, if any
   * @type {string}
   * @memberof EventBodyFlagCheck
   */
  companyId?: string | null;
  /**
   * Report an error that occurred during the flag check
   * @type {string}
   * @memberof EventBodyFlagCheck
   */
  error?: string | null;
  /**
   * Schematic flag ID (starting with 'flag_') for the flag matching the key, if any
   * @type {string}
   * @memberof EventBodyFlagCheck
   */
  flagId?: string | null;
  /**
   * The key of the flag being checked
   * @type {string}
   * @memberof EventBodyFlagCheck
   */
  flagKey: string;
  /**
   * The reason why the value was returned
   * @type {string}
   * @memberof EventBodyFlagCheck
   */
  reason: string;
  /**
   * Key-value pairs used to to identify company for which the flag was checked
   * @type {{ [key: string]: string; }}
   * @memberof EventBodyFlagCheck
   */
  reqCompany?: { [key: string]: string } | null;
  /**
   * Key-value pairs used to to identify user for which the flag was checked
   * @type {{ [key: string]: string; }}
   * @memberof EventBodyFlagCheck
   */
  reqUser?: { [key: string]: string } | null;
  /**
   * Schematic rule ID (starting with 'rule_') of the rule that matched for the flag, if any
   * @type {string}
   * @memberof EventBodyFlagCheck
   */
  ruleId?: string | null;
  /**
   * Schematic user ID (starting with 'user_') of the user evaluated, if any
   * @type {string}
   * @memberof EventBodyFlagCheck
   */
  userId?: string | null;
  /**
   * The value of the flag for the given company and/or user
   * @type {boolean}
   * @memberof EventBodyFlagCheck
   */
  value: boolean;
}

/**
 * Check if a given object implements the EventBodyFlagCheck interface.
 */
export function instanceOfEventBodyFlagCheck(
  value: object,
): value is EventBodyFlagCheck {
  if (!("flagKey" in value) || value["flagKey"] === undefined) return false;
  if (!("reason" in value) || value["reason"] === undefined) return false;
  if (!("value" in value) || value["value"] === undefined) return false;
  return true;
}

export function EventBodyFlagCheckFromJSON(json: any): EventBodyFlagCheck {
  return EventBodyFlagCheckFromJSONTyped(json, false);
}

export function EventBodyFlagCheckFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): EventBodyFlagCheck {
  if (json == null) {
    return json;
  }
  return {
    companyId: json["company_id"] == null ? undefined : json["company_id"],
    error: json["error"] == null ? undefined : json["error"],
    flagId: json["flag_id"] == null ? undefined : json["flag_id"],
    flagKey: json["flag_key"],
    reason: json["reason"],
    reqCompany: json["req_company"] == null ? undefined : json["req_company"],
    reqUser: json["req_user"] == null ? undefined : json["req_user"],
    ruleId: json["rule_id"] == null ? undefined : json["rule_id"],
    userId: json["user_id"] == null ? undefined : json["user_id"],
    value: json["value"],
  };
}

export function EventBodyFlagCheckToJSON(json: any): EventBodyFlagCheck {
  return EventBodyFlagCheckToJSONTyped(json, false);
}

export function EventBodyFlagCheckToJSONTyped(
  value?: EventBodyFlagCheck | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    company_id: value["companyId"],
    error: value["error"],
    flag_id: value["flagId"],
    flag_key: value["flagKey"],
    reason: value["reason"],
    req_company: value["reqCompany"],
    req_user: value["reqUser"],
    rule_id: value["ruleId"],
    user_id: value["userId"],
    value: value["value"],
  };
}
