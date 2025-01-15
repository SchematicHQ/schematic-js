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
import type { RuleConditionDetailResponseData } from "./RuleConditionDetailResponseData";
import {
  RuleConditionDetailResponseDataFromJSON,
  RuleConditionDetailResponseDataFromJSONTyped,
  RuleConditionDetailResponseDataToJSON,
  RuleConditionDetailResponseDataToJSONTyped,
} from "./RuleConditionDetailResponseData";
import type { RuleConditionGroupDetailResponseData } from "./RuleConditionGroupDetailResponseData";
import {
  RuleConditionGroupDetailResponseDataFromJSON,
  RuleConditionGroupDetailResponseDataFromJSONTyped,
  RuleConditionGroupDetailResponseDataToJSON,
  RuleConditionGroupDetailResponseDataToJSONTyped,
} from "./RuleConditionGroupDetailResponseData";

/**
 * The updated resource
 * @export
 * @interface PlanAudienceDetailResponseData
 */
export interface PlanAudienceDetailResponseData {
  /**
   *
   * @type {Array<RuleConditionGroupDetailResponseData>}
   * @memberof PlanAudienceDetailResponseData
   */
  conditionGroups: Array<RuleConditionGroupDetailResponseData>;
  /**
   *
   * @type {Array<RuleConditionDetailResponseData>}
   * @memberof PlanAudienceDetailResponseData
   */
  conditions: Array<RuleConditionDetailResponseData>;
  /**
   *
   * @type {Date}
   * @memberof PlanAudienceDetailResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof PlanAudienceDetailResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof PlanAudienceDetailResponseData
   */
  flagId?: string | null;
  /**
   *
   * @type {string}
   * @memberof PlanAudienceDetailResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof PlanAudienceDetailResponseData
   */
  name: string;
  /**
   *
   * @type {string}
   * @memberof PlanAudienceDetailResponseData
   */
  planId?: string | null;
  /**
   *
   * @type {number}
   * @memberof PlanAudienceDetailResponseData
   */
  priority: number;
  /**
   *
   * @type {string}
   * @memberof PlanAudienceDetailResponseData
   */
  ruleType: string;
  /**
   *
   * @type {Date}
   * @memberof PlanAudienceDetailResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {boolean}
   * @memberof PlanAudienceDetailResponseData
   */
  value: boolean;
}

/**
 * Check if a given object implements the PlanAudienceDetailResponseData interface.
 */
export function instanceOfPlanAudienceDetailResponseData(
  value: object,
): value is PlanAudienceDetailResponseData {
  if (!("conditionGroups" in value) || value["conditionGroups"] === undefined)
    return false;
  if (!("conditions" in value) || value["conditions"] === undefined)
    return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("priority" in value) || value["priority"] === undefined) return false;
  if (!("ruleType" in value) || value["ruleType"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  if (!("value" in value) || value["value"] === undefined) return false;
  return true;
}

export function PlanAudienceDetailResponseDataFromJSON(
  json: any,
): PlanAudienceDetailResponseData {
  return PlanAudienceDetailResponseDataFromJSONTyped(json, false);
}

export function PlanAudienceDetailResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PlanAudienceDetailResponseData {
  if (json == null) {
    return json;
  }
  return {
    conditionGroups: (json["condition_groups"] as Array<any>).map(
      RuleConditionGroupDetailResponseDataFromJSON,
    ),
    conditions: (json["conditions"] as Array<any>).map(
      RuleConditionDetailResponseDataFromJSON,
    ),
    createdAt: new Date(json["created_at"]),
    environmentId: json["environment_id"],
    flagId: json["flag_id"] == null ? undefined : json["flag_id"],
    id: json["id"],
    name: json["name"],
    planId: json["plan_id"] == null ? undefined : json["plan_id"],
    priority: json["priority"],
    ruleType: json["rule_type"],
    updatedAt: new Date(json["updated_at"]),
    value: json["value"],
  };
}

export function PlanAudienceDetailResponseDataToJSON(
  json: any,
): PlanAudienceDetailResponseData {
  return PlanAudienceDetailResponseDataToJSONTyped(json, false);
}

export function PlanAudienceDetailResponseDataToJSONTyped(
  value?: PlanAudienceDetailResponseData | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    condition_groups: (value["conditionGroups"] as Array<any>).map(
      RuleConditionGroupDetailResponseDataToJSON,
    ),
    conditions: (value["conditions"] as Array<any>).map(
      RuleConditionDetailResponseDataToJSON,
    ),
    created_at: value["createdAt"].toISOString(),
    environment_id: value["environmentId"],
    flag_id: value["flagId"],
    id: value["id"],
    name: value["name"],
    plan_id: value["planId"],
    priority: value["priority"],
    rule_type: value["ruleType"],
    updated_at: value["updatedAt"].toISOString(),
    value: value["value"],
  };
}
