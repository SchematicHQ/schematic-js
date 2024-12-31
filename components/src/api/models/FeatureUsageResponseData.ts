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
import type { BillingPriceView } from "./BillingPriceView";
import {
  BillingPriceViewFromJSON,
  BillingPriceViewFromJSONTyped,
  BillingPriceViewToJSON,
} from "./BillingPriceView";
import type { PlanResponseData } from "./PlanResponseData";
import {
  PlanResponseDataFromJSON,
  PlanResponseDataFromJSONTyped,
  PlanResponseDataToJSON,
} from "./PlanResponseData";

/**
 *
 * @export
 * @interface FeatureUsageResponseData
 */
export interface FeatureUsageResponseData {
  /**
   * Whether further usage is permitted.
   * @type {boolean}
   * @memberof FeatureUsageResponseData
   */
  access: boolean;
  /**
   * The maximum amount of usage that is permitted; a null value indicates that unlimited usage is permitted.
   * @type {number}
   * @memberof FeatureUsageResponseData
   */
  allocation?: number | null;
  /**
   * The type of allocation that is being used.
   * @type {string}
   * @memberof FeatureUsageResponseData
   */
  allocationType: FeatureUsageResponseDataAllocationTypeEnum;
  /**
   *
   * @type {Date}
   * @memberof FeatureUsageResponseData
   */
  entitlementExpirationDate?: Date | null;
  /**
   *
   * @type {string}
   * @memberof FeatureUsageResponseData
   */
  entitlementId: string;
  /**
   *
   * @type {string}
   * @memberof FeatureUsageResponseData
   */
  entitlementType: string;
  /**
   *
   * @type {FeatureDetailResponseData}
   * @memberof FeatureUsageResponseData
   */
  feature?: FeatureDetailResponseData;
  /**
   * The time at which the metric will reset.
   * @type {Date}
   * @memberof FeatureUsageResponseData
   */
  metricResetAt?: Date | null;
  /**
   * If the period is current_month, when the month resets.
   * @type {string}
   * @memberof FeatureUsageResponseData
   */
  monthReset?: string | null;
  /**
   *
   * @type {BillingPriceView}
   * @memberof FeatureUsageResponseData
   */
  monthlyUsageBasedPrice?: BillingPriceView;
  /**
   * The period over which usage is measured.
   * @type {string}
   * @memberof FeatureUsageResponseData
   */
  period?: string | null;
  /**
   *
   * @type {PlanResponseData}
   * @memberof FeatureUsageResponseData
   */
  plan?: PlanResponseData;
  /**
   *
   * @type {string}
   * @memberof FeatureUsageResponseData
   */
  priceBehavior?: string | null;
  /**
   * The amount of usage that has been consumed; a null value indicates that usage is not being measured.
   * @type {number}
   * @memberof FeatureUsageResponseData
   */
  usage?: number | null;
  /**
   *
   * @type {BillingPriceView}
   * @memberof FeatureUsageResponseData
   */
  yearlyUsageBasedPrice?: BillingPriceView;
}

/**
 * @export
 */
export const FeatureUsageResponseDataAllocationTypeEnum = {
  Boolean: "boolean",
  Numeric: "numeric",
  Trait: "trait",
  Unlimited: "unlimited",
} as const;
export type FeatureUsageResponseDataAllocationTypeEnum =
  (typeof FeatureUsageResponseDataAllocationTypeEnum)[keyof typeof FeatureUsageResponseDataAllocationTypeEnum];

/**
 * Check if a given object implements the FeatureUsageResponseData interface.
 */
export function instanceOfFeatureUsageResponseData(
  value: object,
): value is FeatureUsageResponseData {
  if (!("access" in value) || value["access"] === undefined) return false;
  if (!("allocationType" in value) || value["allocationType"] === undefined)
    return false;
  if (!("entitlementId" in value) || value["entitlementId"] === undefined)
    return false;
  if (!("entitlementType" in value) || value["entitlementType"] === undefined)
    return false;
  return true;
}

export function FeatureUsageResponseDataFromJSON(
  json: any,
): FeatureUsageResponseData {
  return FeatureUsageResponseDataFromJSONTyped(json, false);
}

export function FeatureUsageResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): FeatureUsageResponseData {
  if (json == null) {
    return json;
  }
  return {
    access: json["access"],
    allocation: json["allocation"] == null ? undefined : json["allocation"],
    allocationType: json["allocation_type"],
    entitlementExpirationDate:
      json["entitlement_expiration_date"] == null
        ? undefined
        : new Date(json["entitlement_expiration_date"]),
    entitlementId: json["entitlement_id"],
    entitlementType: json["entitlement_type"],
    feature:
      json["feature"] == null
        ? undefined
        : FeatureDetailResponseDataFromJSON(json["feature"]),
    metricResetAt:
      json["metric_reset_at"] == null
        ? undefined
        : new Date(json["metric_reset_at"]),
    monthReset: json["month_reset"] == null ? undefined : json["month_reset"],
    monthlyUsageBasedPrice:
      json["monthly_usage_based_price"] == null
        ? undefined
        : BillingPriceViewFromJSON(json["monthly_usage_based_price"]),
    period: json["period"] == null ? undefined : json["period"],
    plan:
      json["plan"] == null ? undefined : PlanResponseDataFromJSON(json["plan"]),
    priceBehavior:
      json["price_behavior"] == null ? undefined : json["price_behavior"],
    usage: json["usage"] == null ? undefined : json["usage"],
    yearlyUsageBasedPrice:
      json["yearly_usage_based_price"] == null
        ? undefined
        : BillingPriceViewFromJSON(json["yearly_usage_based_price"]),
  };
}

export function FeatureUsageResponseDataToJSON(
  value?: FeatureUsageResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    access: value["access"],
    allocation: value["allocation"],
    allocation_type: value["allocationType"],
    entitlement_expiration_date:
      value["entitlementExpirationDate"] == null
        ? undefined
        : (value["entitlementExpirationDate"] as any).toISOString(),
    entitlement_id: value["entitlementId"],
    entitlement_type: value["entitlementType"],
    feature: FeatureDetailResponseDataToJSON(value["feature"]),
    metric_reset_at:
      value["metricResetAt"] == null
        ? undefined
        : (value["metricResetAt"] as any).toISOString(),
    month_reset: value["monthReset"],
    monthly_usage_based_price: BillingPriceViewToJSON(
      value["monthlyUsageBasedPrice"],
    ),
    period: value["period"],
    plan: PlanResponseDataToJSON(value["plan"]),
    price_behavior: value["priceBehavior"],
    usage: value["usage"],
    yearly_usage_based_price: BillingPriceViewToJSON(
      value["yearlyUsageBasedPrice"],
    ),
  };
}
