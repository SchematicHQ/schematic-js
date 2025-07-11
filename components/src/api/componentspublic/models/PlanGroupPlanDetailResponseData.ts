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
import type { CustomPlanViewConfigResponseData } from "./CustomPlanViewConfigResponseData";
import {
  CustomPlanViewConfigResponseDataFromJSON,
  CustomPlanViewConfigResponseDataFromJSONTyped,
  CustomPlanViewConfigResponseDataToJSON,
} from "./CustomPlanViewConfigResponseData";
import type { BillingProductDetailResponseData } from "./BillingProductDetailResponseData";
import {
  BillingProductDetailResponseDataFromJSON,
  BillingProductDetailResponseDataFromJSONTyped,
  BillingProductDetailResponseDataToJSON,
} from "./BillingProductDetailResponseData";

/**
 *
 * @export
 * @interface PlanGroupPlanDetailResponseData
 */
export interface PlanGroupPlanDetailResponseData {
  /**
   *
   * @type {string}
   * @memberof PlanGroupPlanDetailResponseData
   */
  audienceType?: string | null;
  /**
   *
   * @type {BillingProductDetailResponseData}
   * @memberof PlanGroupPlanDetailResponseData
   */
  billingProduct?: BillingProductDetailResponseData;
  /**
   *
   * @type {string}
   * @memberof PlanGroupPlanDetailResponseData
   */
  chargeType: string;
  /**
   *
   * @type {number}
   * @memberof PlanGroupPlanDetailResponseData
   */
  companyCount: number;
  /**
   *
   * @type {Array<string>}
   * @memberof PlanGroupPlanDetailResponseData
   */
  compatiblePlanIds: Array<string>;
  /**
   *
   * @type {string}
   * @memberof PlanGroupPlanDetailResponseData
   */
  controlledBy: string;
  /**
   *
   * @type {Date}
   * @memberof PlanGroupPlanDetailResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {CustomPlanViewConfigResponseData}
   * @memberof PlanGroupPlanDetailResponseData
   */
  customPlanConfig?: CustomPlanViewConfigResponseData;
  /**
   *
   * @type {string}
   * @memberof PlanGroupPlanDetailResponseData
   */
  description: string;
  /**
   *
   * @type {Array<PlanEntitlementResponseData>}
   * @memberof PlanGroupPlanDetailResponseData
   */
  entitlements: Array<PlanEntitlementResponseData>;
  /**
   *
   * @type {Array<FeatureDetailResponseData>}
   * @memberof PlanGroupPlanDetailResponseData
   */
  features: Array<FeatureDetailResponseData>;
  /**
   *
   * @type {string}
   * @memberof PlanGroupPlanDetailResponseData
   */
  icon: string;
  /**
   *
   * @type {string}
   * @memberof PlanGroupPlanDetailResponseData
   */
  id: string;
  /**
   *
   * @type {boolean}
   * @memberof PlanGroupPlanDetailResponseData
   */
  isCustom: boolean;
  /**
   *
   * @type {boolean}
   * @memberof PlanGroupPlanDetailResponseData
   */
  isDefault: boolean;
  /**
   *
   * @type {boolean}
   * @memberof PlanGroupPlanDetailResponseData
   */
  isFree: boolean;
  /**
   *
   * @type {boolean}
   * @memberof PlanGroupPlanDetailResponseData
   */
  isTrialable: boolean;
  /**
   *
   * @type {BillingPriceResponseData}
   * @memberof PlanGroupPlanDetailResponseData
   */
  monthlyPrice?: BillingPriceResponseData;
  /**
   *
   * @type {string}
   * @memberof PlanGroupPlanDetailResponseData
   */
  name: string;
  /**
   *
   * @type {BillingPriceResponseData}
   * @memberof PlanGroupPlanDetailResponseData
   */
  oneTimePrice?: BillingPriceResponseData;
  /**
   *
   * @type {string}
   * @memberof PlanGroupPlanDetailResponseData
   */
  planType: string;
  /**
   *
   * @type {number}
   * @memberof PlanGroupPlanDetailResponseData
   */
  trialDays?: number | null;
  /**
   *
   * @type {Date}
   * @memberof PlanGroupPlanDetailResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {BillingPriceResponseData}
   * @memberof PlanGroupPlanDetailResponseData
   */
  yearlyPrice?: BillingPriceResponseData;
}

/**
 * Check if a given object implements the PlanGroupPlanDetailResponseData interface.
 */
export function instanceOfPlanGroupPlanDetailResponseData(
  value: object,
): value is PlanGroupPlanDetailResponseData {
  if (!("chargeType" in value) || value["chargeType"] === undefined)
    return false;
  if (!("companyCount" in value) || value["companyCount"] === undefined)
    return false;
  if (
    !("compatiblePlanIds" in value) ||
    value["compatiblePlanIds"] === undefined
  )
    return false;
  if (!("controlledBy" in value) || value["controlledBy"] === undefined)
    return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("description" in value) || value["description"] === undefined)
    return false;
  if (!("entitlements" in value) || value["entitlements"] === undefined)
    return false;
  if (!("features" in value) || value["features"] === undefined) return false;
  if (!("icon" in value) || value["icon"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("isCustom" in value) || value["isCustom"] === undefined) return false;
  if (!("isDefault" in value) || value["isDefault"] === undefined) return false;
  if (!("isFree" in value) || value["isFree"] === undefined) return false;
  if (!("isTrialable" in value) || value["isTrialable"] === undefined)
    return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("planType" in value) || value["planType"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  return true;
}

export function PlanGroupPlanDetailResponseDataFromJSON(
  json: any,
): PlanGroupPlanDetailResponseData {
  return PlanGroupPlanDetailResponseDataFromJSONTyped(json, false);
}

export function PlanGroupPlanDetailResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PlanGroupPlanDetailResponseData {
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
    chargeType: json["charge_type"],
    companyCount: json["company_count"],
    compatiblePlanIds: json["compatible_plan_ids"],
    controlledBy: json["controlled_by"],
    createdAt: new Date(json["created_at"]),
    customPlanConfig:
      json["custom_plan_config"] == null
        ? undefined
        : CustomPlanViewConfigResponseDataFromJSON(json["custom_plan_config"]),
    description: json["description"],
    entitlements: (json["entitlements"] as Array<any>).map(
      PlanEntitlementResponseDataFromJSON,
    ),
    features: (json["features"] as Array<any>).map(
      FeatureDetailResponseDataFromJSON,
    ),
    icon: json["icon"],
    id: json["id"],
    isCustom: json["is_custom"],
    isDefault: json["is_default"],
    isFree: json["is_free"],
    isTrialable: json["is_trialable"],
    monthlyPrice:
      json["monthly_price"] == null
        ? undefined
        : BillingPriceResponseDataFromJSON(json["monthly_price"]),
    name: json["name"],
    oneTimePrice:
      json["one_time_price"] == null
        ? undefined
        : BillingPriceResponseDataFromJSON(json["one_time_price"]),
    planType: json["plan_type"],
    trialDays: json["trial_days"] == null ? undefined : json["trial_days"],
    updatedAt: new Date(json["updated_at"]),
    yearlyPrice:
      json["yearly_price"] == null
        ? undefined
        : BillingPriceResponseDataFromJSON(json["yearly_price"]),
  };
}

export function PlanGroupPlanDetailResponseDataToJSON(
  value?: PlanGroupPlanDetailResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    audience_type: value["audienceType"],
    billing_product: BillingProductDetailResponseDataToJSON(
      value["billingProduct"],
    ),
    charge_type: value["chargeType"],
    company_count: value["companyCount"],
    compatible_plan_ids: value["compatiblePlanIds"],
    controlled_by: value["controlledBy"],
    created_at: value["createdAt"].toISOString(),
    custom_plan_config: CustomPlanViewConfigResponseDataToJSON(
      value["customPlanConfig"],
    ),
    description: value["description"],
    entitlements: (value["entitlements"] as Array<any>).map(
      PlanEntitlementResponseDataToJSON,
    ),
    features: (value["features"] as Array<any>).map(
      FeatureDetailResponseDataToJSON,
    ),
    icon: value["icon"],
    id: value["id"],
    is_custom: value["isCustom"],
    is_default: value["isDefault"],
    is_free: value["isFree"],
    is_trialable: value["isTrialable"],
    monthly_price: BillingPriceResponseDataToJSON(value["monthlyPrice"]),
    name: value["name"],
    one_time_price: BillingPriceResponseDataToJSON(value["oneTimePrice"]),
    plan_type: value["planType"],
    trial_days: value["trialDays"],
    updated_at: value["updatedAt"].toISOString(),
    yearly_price: BillingPriceResponseDataToJSON(value["yearlyPrice"]),
  };
}
