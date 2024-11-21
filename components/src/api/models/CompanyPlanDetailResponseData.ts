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
import type { PlanEntitlementResponseData } from "./PlanEntitlementResponseData";
import {
  PlanEntitlementResponseDataFromJSON,
  PlanEntitlementResponseDataFromJSONTyped,
  PlanEntitlementResponseDataToJSON,
} from "./PlanEntitlementResponseData";
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
 * @interface CompanyPlanDetailResponseData
 */
export interface CompanyPlanDetailResponseData {
  /**
   *
   * @type {string}
   * @memberof CompanyPlanDetailResponseData
   */
  audienceType?: string | null;
  /**
   *
   * @type {BillingProductDetailResponseData}
   * @memberof CompanyPlanDetailResponseData
   */
  billingProduct?: BillingProductDetailResponseData;
  /**
   *
   * @type {number}
   * @memberof CompanyPlanDetailResponseData
   */
  companyCount: number;
  /**
   *
   * @type {Date}
   * @memberof CompanyPlanDetailResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {boolean}
   * @memberof CompanyPlanDetailResponseData
   */
  current: boolean;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanDetailResponseData
   */
  description: string;
  /**
   *
   * @type {Array<PlanEntitlementResponseData>}
   * @memberof CompanyPlanDetailResponseData
   */
  entitlements: Array<PlanEntitlementResponseData>;
  /**
   *
   * @type {Array<FeatureDetailResponseData>}
   * @memberof CompanyPlanDetailResponseData
   */
  features: Array<FeatureDetailResponseData>;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanDetailResponseData
   */
  icon: string;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanDetailResponseData
   */
  id: string;
  /**
   *
   * @type {boolean}
   * @memberof CompanyPlanDetailResponseData
   */
  isDefault: boolean;
  /**
   *
   * @type {boolean}
   * @memberof CompanyPlanDetailResponseData
   */
  isFree: boolean;
  /**
   *
   * @type {boolean}
   * @memberof CompanyPlanDetailResponseData
   */
  isTrialable: boolean;
  /**
   *
   * @type {BillingPriceResponseData}
   * @memberof CompanyPlanDetailResponseData
   */
  monthlyPrice?: BillingPriceResponseData;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanDetailResponseData
   */
  name: string;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanDetailResponseData
   */
  planType: string;
  /**
   *
   * @type {number}
   * @memberof CompanyPlanDetailResponseData
   */
  trialDays?: number | null;
  /**
   *
   * @type {Date}
   * @memberof CompanyPlanDetailResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {boolean}
   * @memberof CompanyPlanDetailResponseData
   */
  valid: boolean;
  /**
   *
   * @type {BillingPriceResponseData}
   * @memberof CompanyPlanDetailResponseData
   */
  yearlyPrice?: BillingPriceResponseData;
}

/**
 * Check if a given object implements the CompanyPlanDetailResponseData interface.
 */
export function instanceOfCompanyPlanDetailResponseData(
  value: object,
): value is CompanyPlanDetailResponseData {
  if (!("companyCount" in value) || value["companyCount"] === undefined)
    return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("current" in value) || value["current"] === undefined) return false;
  if (!("description" in value) || value["description"] === undefined)
    return false;
  if (!("entitlements" in value) || value["entitlements"] === undefined)
    return false;
  if (!("features" in value) || value["features"] === undefined) return false;
  if (!("icon" in value) || value["icon"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("isDefault" in value) || value["isDefault"] === undefined) return false;
  if (!("isFree" in value) || value["isFree"] === undefined) return false;
  if (!("isTrialable" in value) || value["isTrialable"] === undefined)
    return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("planType" in value) || value["planType"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  if (!("valid" in value) || value["valid"] === undefined) return false;
  return true;
}

export function CompanyPlanDetailResponseDataFromJSON(
  json: any,
): CompanyPlanDetailResponseData {
  return CompanyPlanDetailResponseDataFromJSONTyped(json, false);
}

export function CompanyPlanDetailResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CompanyPlanDetailResponseData {
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
    current: json["current"],
    description: json["description"],
    entitlements: (json["entitlements"] as Array<any>).map(
      PlanEntitlementResponseDataFromJSON,
    ),
    features: (json["features"] as Array<any>).map(
      FeatureDetailResponseDataFromJSON,
    ),
    icon: json["icon"],
    id: json["id"],
    isDefault: json["is_default"],
    isFree: json["is_free"],
    isTrialable: json["is_trialable"],
    monthlyPrice:
      json["monthly_price"] == null
        ? undefined
        : BillingPriceResponseDataFromJSON(json["monthly_price"]),
    name: json["name"],
    planType: json["plan_type"],
    trialDays: json["trial_days"] == null ? undefined : json["trial_days"],
    updatedAt: new Date(json["updated_at"]),
    valid: json["valid"],
    yearlyPrice:
      json["yearly_price"] == null
        ? undefined
        : BillingPriceResponseDataFromJSON(json["yearly_price"]),
  };
}

export function CompanyPlanDetailResponseDataToJSON(
  value?: CompanyPlanDetailResponseData | null,
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
    current: value["current"],
    description: value["description"],
    entitlements: (value["entitlements"] as Array<any>).map(
      PlanEntitlementResponseDataToJSON,
    ),
    features: (value["features"] as Array<any>).map(
      FeatureDetailResponseDataToJSON,
    ),
    icon: value["icon"],
    id: value["id"],
    is_default: value["isDefault"],
    is_free: value["isFree"],
    is_trialable: value["isTrialable"],
    monthly_price: BillingPriceResponseDataToJSON(value["monthlyPrice"]),
    name: value["name"],
    plan_type: value["planType"],
    trial_days: value["trialDays"],
    updated_at: value["updatedAt"].toISOString(),
    valid: value["valid"],
    yearly_price: BillingPriceResponseDataToJSON(value["yearlyPrice"]),
  };
}
