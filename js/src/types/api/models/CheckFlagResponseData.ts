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
 * The returned resource
 * @export
 * @interface CheckFlagResponseData
 */
export interface CheckFlagResponseData {
  /**
   * If company keys were provided and matched a company, its ID
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  companyId?: string | null;
  /**
   * If an error occurred while checking the flag, the error message
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  error?: string | null;
  /**
   * If a numeric feature entitlement rule was matched, its allocation
   * @type {number}
   * @memberof CheckFlagResponseData
   */
  featureAllocation?: number | null;
  /**
   * If a numeric feature entitlement rule was matched, the company's usage
   * @type {number}
   * @memberof CheckFlagResponseData
   */
  featureUsage?: number | null;
  /**
   * For event-based feature entitlement rules, the period over which usage is tracked (current_month, current_day, current_week, all_time)
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  featureUsagePeriod?: string | null;
  /**
   * For event-based feature entitlement rules, when the usage period will reset
   * @type {Date}
   * @memberof CheckFlagResponseData
   */
  featureUsageResetAt?: Date | null;
  /**
   * The key used to check the flag
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  flag: string;
  /**
   * If a flag was found, its ID
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  flagId?: string | null;
  /**
   * A human-readable explanation of the result
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  reason: string;
  /**
   * If a rule was found, its ID
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  ruleId?: string | null;
  /**
   * If a rule was found, its type
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  ruleType?: string | null;
  /**
   * If user keys were provided and matched a user, its ID
   * @type {string}
   * @memberof CheckFlagResponseData
   */
  userId?: string | null;
  /**
   * A boolean flag check result; for feature entitlements, this represents whether further consumption of the feature is permitted
   * @type {boolean}
   * @memberof CheckFlagResponseData
   */
  value: boolean;
}

/**
 * Check if a given object implements the CheckFlagResponseData interface.
 */
export function instanceOfCheckFlagResponseData(
  value: object,
): value is CheckFlagResponseData {
  if (!("flag" in value) || value["flag"] === undefined) return false;
  if (!("reason" in value) || value["reason"] === undefined) return false;
  if (!("value" in value) || value["value"] === undefined) return false;
  return true;
}

export function CheckFlagResponseDataFromJSON(
  json: any,
): CheckFlagResponseData {
  return CheckFlagResponseDataFromJSONTyped(json, false);
}

export function CheckFlagResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CheckFlagResponseData {
  if (json == null) {
    return json;
  }
  return {
    companyId: json["company_id"] == null ? undefined : json["company_id"],
    error: json["error"] == null ? undefined : json["error"],
    featureAllocation:
      json["feature_allocation"] == null
        ? undefined
        : json["feature_allocation"],
    featureUsage:
      json["feature_usage"] == null ? undefined : json["feature_usage"],
    featureUsagePeriod:
      json["feature_usage_period"] == null
        ? undefined
        : json["feature_usage_period"],
    featureUsageResetAt:
      json["feature_usage_reset_at"] == null
        ? undefined
        : new Date(json["feature_usage_reset_at"]),
    flag: json["flag"],
    flagId: json["flag_id"] == null ? undefined : json["flag_id"],
    reason: json["reason"],
    ruleId: json["rule_id"] == null ? undefined : json["rule_id"],
    ruleType: json["rule_type"] == null ? undefined : json["rule_type"],
    userId: json["user_id"] == null ? undefined : json["user_id"],
    value: json["value"],
  };
}

export function CheckFlagResponseDataToJSON(json: any): CheckFlagResponseData {
  return CheckFlagResponseDataToJSONTyped(json, false);
}

export function CheckFlagResponseDataToJSONTyped(
  value?: CheckFlagResponseData | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    company_id: value["companyId"],
    error: value["error"],
    feature_allocation: value["featureAllocation"],
    feature_usage: value["featureUsage"],
    feature_usage_period: value["featureUsagePeriod"],
    feature_usage_reset_at:
      value["featureUsageResetAt"] == null
        ? undefined
        : (value["featureUsageResetAt"] as any).toISOString(),
    flag: value["flag"],
    flag_id: value["flagId"],
    reason: value["reason"],
    rule_id: value["ruleId"],
    rule_type: value["ruleType"],
    user_id: value["userId"],
    value: value["value"],
  };
}
