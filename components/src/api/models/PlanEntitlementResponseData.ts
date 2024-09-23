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
import type { EntityTraitDefinitionResponseData } from "./EntityTraitDefinitionResponseData";
import {
  EntityTraitDefinitionResponseDataFromJSON,
  EntityTraitDefinitionResponseDataFromJSONTyped,
  EntityTraitDefinitionResponseDataToJSON,
} from "./EntityTraitDefinitionResponseData";
import type { FeatureResponseData } from "./FeatureResponseData";
import {
  FeatureResponseDataFromJSON,
  FeatureResponseDataFromJSONTyped,
  FeatureResponseDataToJSON,
} from "./FeatureResponseData";
import type { PlanResponseData } from "./PlanResponseData";
import {
  PlanResponseDataFromJSON,
  PlanResponseDataFromJSONTyped,
  PlanResponseDataToJSON,
} from "./PlanResponseData";

/**
 *
 * @export
 * @interface PlanEntitlementResponseData
 */
export interface PlanEntitlementResponseData {
  /**
   *
   * @type {Date}
   * @memberof PlanEntitlementResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof PlanEntitlementResponseData
   */
  environmentId: string;
  /**
   *
   * @type {FeatureResponseData}
   * @memberof PlanEntitlementResponseData
   */
  feature?: FeatureResponseData;
  /**
   *
   * @type {string}
   * @memberof PlanEntitlementResponseData
   */
  featureId: string;
  /**
   *
   * @type {string}
   * @memberof PlanEntitlementResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof PlanEntitlementResponseData
   */
  metricPeriod?: string | null;
  /**
   *
   * @type {PlanResponseData}
   * @memberof PlanEntitlementResponseData
   */
  plan?: PlanResponseData;
  /**
   *
   * @type {string}
   * @memberof PlanEntitlementResponseData
   */
  planId: string;
  /**
   *
   * @type {string}
   * @memberof PlanEntitlementResponseData
   */
  ruleId: string;
  /**
   *
   * @type {Date}
   * @memberof PlanEntitlementResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {boolean}
   * @memberof PlanEntitlementResponseData
   */
  valueBool?: boolean | null;
  /**
   *
   * @type {number}
   * @memberof PlanEntitlementResponseData
   */
  valueNumeric?: number | null;
  /**
   *
   * @type {EntityTraitDefinitionResponseData}
   * @memberof PlanEntitlementResponseData
   */
  valueTrait?: EntityTraitDefinitionResponseData;
  /**
   *
   * @type {string}
   * @memberof PlanEntitlementResponseData
   */
  valueTraitId?: string | null;
  /**
   *
   * @type {string}
   * @memberof PlanEntitlementResponseData
   */
  valueType: string;
}

/**
 * Check if a given object implements the PlanEntitlementResponseData interface.
 */
export function instanceOfPlanEntitlementResponseData(
  value: object,
): value is PlanEntitlementResponseData {
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("featureId" in value) || value["featureId"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("planId" in value) || value["planId"] === undefined) return false;
  if (!("ruleId" in value) || value["ruleId"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  if (!("valueType" in value) || value["valueType"] === undefined) return false;
  return true;
}

export function PlanEntitlementResponseDataFromJSON(
  json: any,
): PlanEntitlementResponseData {
  return PlanEntitlementResponseDataFromJSONTyped(json, false);
}

export function PlanEntitlementResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PlanEntitlementResponseData {
  if (json == null) {
    return json;
  }
  return {
    createdAt: new Date(json["created_at"]),
    environmentId: json["environment_id"],
    feature:
      json["feature"] == null
        ? undefined
        : FeatureResponseDataFromJSON(json["feature"]),
    featureId: json["feature_id"],
    id: json["id"],
    metricPeriod:
      json["metric_period"] == null ? undefined : json["metric_period"],
    plan:
      json["plan"] == null ? undefined : PlanResponseDataFromJSON(json["plan"]),
    planId: json["plan_id"],
    ruleId: json["rule_id"],
    updatedAt: new Date(json["updated_at"]),
    valueBool: json["value_bool"] == null ? undefined : json["value_bool"],
    valueNumeric:
      json["value_numeric"] == null ? undefined : json["value_numeric"],
    valueTrait:
      json["value_trait"] == null
        ? undefined
        : EntityTraitDefinitionResponseDataFromJSON(json["value_trait"]),
    valueTraitId:
      json["value_trait_id"] == null ? undefined : json["value_trait_id"],
    valueType: json["value_type"],
  };
}

export function PlanEntitlementResponseDataToJSON(
  value?: PlanEntitlementResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    created_at: value["createdAt"].toISOString(),
    environment_id: value["environmentId"],
    feature: FeatureResponseDataToJSON(value["feature"]),
    feature_id: value["featureId"],
    id: value["id"],
    metric_period: value["metricPeriod"],
    plan: PlanResponseDataToJSON(value["plan"]),
    plan_id: value["planId"],
    rule_id: value["ruleId"],
    updated_at: value["updatedAt"].toISOString(),
    value_bool: value["valueBool"],
    value_numeric: value["valueNumeric"],
    value_trait: EntityTraitDefinitionResponseDataToJSON(value["valueTrait"]),
    value_trait_id: value["valueTraitId"],
    value_type: value["valueType"],
  };
}
