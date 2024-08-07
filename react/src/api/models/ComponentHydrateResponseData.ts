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
import type { ComponentResponseData } from "./ComponentResponseData";
import {
  ComponentResponseDataFromJSON,
  ComponentResponseDataFromJSONTyped,
  ComponentResponseDataToJSON,
} from "./ComponentResponseData";
import type { FeatureUsageDetailResponseData } from "./FeatureUsageDetailResponseData";
import {
  FeatureUsageDetailResponseDataFromJSON,
  FeatureUsageDetailResponseDataFromJSONTyped,
  FeatureUsageDetailResponseDataToJSON,
} from "./FeatureUsageDetailResponseData";
import type { CompanyDetailResponseData } from "./CompanyDetailResponseData";
import {
  CompanyDetailResponseDataFromJSON,
  CompanyDetailResponseDataFromJSONTyped,
  CompanyDetailResponseDataToJSON,
} from "./CompanyDetailResponseData";

/**
 * The returned resource
 * @export
 * @interface ComponentHydrateResponseData
 */
export interface ComponentHydrateResponseData {
  /**
   *
   * @type {CompanyDetailResponseData}
   * @memberof ComponentHydrateResponseData
   */
  company?: CompanyDetailResponseData;
  /**
   *
   * @type {ComponentResponseData}
   * @memberof ComponentHydrateResponseData
   */
  component?: ComponentResponseData;
  /**
   *
   * @type {FeatureUsageDetailResponseData}
   * @memberof ComponentHydrateResponseData
   */
  featureUsage?: FeatureUsageDetailResponseData;
}

/**
 * Check if a given object implements the ComponentHydrateResponseData interface.
 */
export function instanceOfComponentHydrateResponseData(
  value: object,
): value is ComponentHydrateResponseData {
  return true;
}

export function ComponentHydrateResponseDataFromJSON(
  json: any,
): ComponentHydrateResponseData {
  return ComponentHydrateResponseDataFromJSONTyped(json, false);
}

export function ComponentHydrateResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ComponentHydrateResponseData {
  if (json == null) {
    return json;
  }
  return {
    company:
      json["company"] == null
        ? undefined
        : CompanyDetailResponseDataFromJSON(json["company"]),
    component:
      json["component"] == null
        ? undefined
        : ComponentResponseDataFromJSON(json["component"]),
    featureUsage:
      json["feature_usage"] == null
        ? undefined
        : FeatureUsageDetailResponseDataFromJSON(json["feature_usage"]),
  };
}

export function ComponentHydrateResponseDataToJSON(
  value?: ComponentHydrateResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    company: CompanyDetailResponseDataToJSON(value["company"]),
    component: ComponentResponseDataToJSON(value["component"]),
    feature_usage: FeatureUsageDetailResponseDataToJSON(value["featureUsage"]),
  };
}
