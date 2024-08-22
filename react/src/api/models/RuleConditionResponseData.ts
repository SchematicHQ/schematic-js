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
 * @interface RuleConditionResponseData
 */
export interface RuleConditionResponseData {
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  comparisonTraitId?: string | null;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  conditionGroupId?: string | null;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  conditionType: string;
  /**
   *
   * @type {Date}
   * @memberof RuleConditionResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  eventSubtype?: string | null;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  flagId?: string | null;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  metricPeriod?: string | null;
  /**
   *
   * @type {number}
   * @memberof RuleConditionResponseData
   */
  metricValue?: number | null;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  operator: string;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  planId?: string | null;
  /**
   *
   * @type {Array<string>}
   * @memberof RuleConditionResponseData
   */
  resourceIds: Array<string>;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  ruleId: string;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  traitEntityType?: string | null;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  traitId?: string | null;
  /**
   *
   * @type {string}
   * @memberof RuleConditionResponseData
   */
  traitValue: string;
  /**
   *
   * @type {Date}
   * @memberof RuleConditionResponseData
   */
  updatedAt: Date;
}

/**
 * Check if a given object implements the RuleConditionResponseData interface.
 */
export function instanceOfRuleConditionResponseData(
  value: object,
): value is RuleConditionResponseData {
  if (!("conditionType" in value) || value["conditionType"] === undefined)
    return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("operator" in value) || value["operator"] === undefined) return false;
  if (!("resourceIds" in value) || value["resourceIds"] === undefined)
    return false;
  if (!("ruleId" in value) || value["ruleId"] === undefined) return false;
  if (!("traitValue" in value) || value["traitValue"] === undefined)
    return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  return true;
}

export function RuleConditionResponseDataFromJSON(
  json: any,
): RuleConditionResponseData {
  return RuleConditionResponseDataFromJSONTyped(json, false);
}

export function RuleConditionResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): RuleConditionResponseData {
  if (json == null) {
    return json;
  }
  return {
    comparisonTraitId:
      json["comparison_trait_id"] == null
        ? undefined
        : json["comparison_trait_id"],
    conditionGroupId:
      json["condition_group_id"] == null
        ? undefined
        : json["condition_group_id"],
    conditionType: json["condition_type"],
    createdAt: new Date(json["created_at"]),
    environmentId: json["environment_id"],
    eventSubtype:
      json["event_subtype"] == null ? undefined : json["event_subtype"],
    flagId: json["flag_id"] == null ? undefined : json["flag_id"],
    id: json["id"],
    metricPeriod:
      json["metric_period"] == null ? undefined : json["metric_period"],
    metricValue:
      json["metric_value"] == null ? undefined : json["metric_value"],
    operator: json["operator"],
    planId: json["plan_id"] == null ? undefined : json["plan_id"],
    resourceIds: json["resource_ids"],
    ruleId: json["rule_id"],
    traitEntityType:
      json["trait_entity_type"] == null ? undefined : json["trait_entity_type"],
    traitId: json["trait_id"] == null ? undefined : json["trait_id"],
    traitValue: json["trait_value"],
    updatedAt: new Date(json["updated_at"]),
  };
}

export function RuleConditionResponseDataToJSON(
  value?: RuleConditionResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    comparison_trait_id: value["comparisonTraitId"],
    condition_group_id: value["conditionGroupId"],
    condition_type: value["conditionType"],
    created_at: value["createdAt"].toISOString(),
    environment_id: value["environmentId"],
    event_subtype: value["eventSubtype"],
    flag_id: value["flagId"],
    id: value["id"],
    metric_period: value["metricPeriod"],
    metric_value: value["metricValue"],
    operator: value["operator"],
    plan_id: value["planId"],
    resource_ids: value["resourceIds"],
    rule_id: value["ruleId"],
    trait_entity_type: value["traitEntityType"],
    trait_id: value["traitId"],
    trait_value: value["traitValue"],
    updated_at: value["updatedAt"].toISOString(),
  };
}