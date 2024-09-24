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
import type { FeatureDetailResponseData } from "./FeatureDetailResponseData";
import {
  FeatureDetailResponseDataFromJSON,
  FeatureDetailResponseDataFromJSONTyped,
  FeatureDetailResponseDataToJSON,
} from "./FeatureDetailResponseData";
import type { BillingPriceResponseData } from "./BillingPriceResponseData";
import {
  BillingPriceResponseDataFromJSON,
  BillingPriceResponseDataFromJSONTyped,
  BillingPriceResponseDataToJSON,
} from "./BillingPriceResponseData";
import type { BillingProductDetailResponseData } from "./BillingProductDetailResponseData";
import {
  BillingProductDetailResponseDataFromJSON,
  BillingProductDetailResponseDataFromJSONTyped,
  BillingProductDetailResponseDataToJSON,
} from "./BillingProductDetailResponseData";

/**
 *
 * @export
 * @interface PlanDetailResponseData
 */
export interface PlanDetailResponseData {
  /**
   *
   * @type {string}
   * @memberof PlanDetailResponseData
   */
  audienceType?: string | null;
  /**
   *
   * @type {BillingProductDetailResponseData}
   * @memberof PlanDetailResponseData
   */
  billingProduct?: BillingProductDetailResponseData;
  /**
   *
   * @type {number}
   * @memberof PlanDetailResponseData
   */
  companyCount: number;
  /**
   *
   * @type {Date}
   * @memberof PlanDetailResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof PlanDetailResponseData
   */
  description: string;
  /**
   *
   * @type {Array<FeatureDetailResponseData>}
   * @memberof PlanDetailResponseData
   */
  features: Array<FeatureDetailResponseData>;
  /**
   *
   * @type {string}
   * @memberof PlanDetailResponseData
   */
  icon: string;
  /**
   *
   * @type {string}
   * @memberof PlanDetailResponseData
   */
  id: string;
  /**
   *
   * @type {BillingPriceResponseData}
   * @memberof PlanDetailResponseData
   */
  monthlyPrice?: BillingPriceResponseData;
  /**
   *
   * @type {string}
   * @memberof PlanDetailResponseData
   */
  name: string;
  /**
   *
   * @type {string}
   * @memberof PlanDetailResponseData
   */
  planType: string;
  /**
   *
   * @type {Date}
   * @memberof PlanDetailResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {BillingPriceResponseData}
   * @memberof PlanDetailResponseData
   */
  yearlyPrice?: BillingPriceResponseData;
}

/**
 * Check if a given object implements the PlanDetailResponseData interface.
 */
export function instanceOfPlanDetailResponseData(
  value: object,
): value is PlanDetailResponseData {
  if (!("companyCount" in value) || value["companyCount"] === undefined)
    return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("description" in value) || value["description"] === undefined)
    return false;
  if (!("features" in value) || value["features"] === undefined) return false;
  if (!("icon" in value) || value["icon"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("planType" in value) || value["planType"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  return true;
}

export function PlanDetailResponseDataFromJSON(
  json: any,
): PlanDetailResponseData {
  return PlanDetailResponseDataFromJSONTyped(json, false);
}

export function PlanDetailResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PlanDetailResponseData {
  if (json == null) {
    return json;
  }
  return {
    audienceType:
      json["audience_type"] == null ? undefined : json["audience_type"],
    billingProduct:
      json["billing_product"] == null
        ? undefined
        : BillingProductDetailResponseDataFromJSON(json["billing_product"]),
    companyCount: json["company_count"],
    createdAt: new Date(json["created_at"]),
    description: json["description"],
    features: (json["features"] as Array<any>).map(
      FeatureDetailResponseDataFromJSON,
    ),
    icon: json["icon"],
    id: json["id"],
    monthlyPrice:
      json["monthly_price"] == null
        ? undefined
        : BillingPriceResponseDataFromJSON(json["monthly_price"]),
    name: json["name"],
    planType: json["plan_type"],
    updatedAt: new Date(json["updated_at"]),
    yearlyPrice:
      json["yearly_price"] == null
        ? undefined
        : BillingPriceResponseDataFromJSON(json["yearly_price"]),
  };
}

export function PlanDetailResponseDataToJSON(
  value?: PlanDetailResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    audience_type: value["audienceType"],
    billing_product: BillingProductDetailResponseDataToJSON(
      value["billingProduct"],
    ),
    company_count: value["companyCount"],
    created_at: value["createdAt"].toISOString(),
    description: value["description"],
    features: (value["features"] as Array<any>).map(
      FeatureDetailResponseDataToJSON,
    ),
    icon: value["icon"],
    id: value["id"],
    monthly_price: BillingPriceResponseDataToJSON(value["monthlyPrice"]),
    name: value["name"],
    plan_type: value["planType"],
    updated_at: value["updatedAt"].toISOString(),
    yearly_price: BillingPriceResponseDataToJSON(value["yearlyPrice"]),
  };
}