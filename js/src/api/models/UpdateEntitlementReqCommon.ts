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
 * @interface UpdateEntitlementReqCommon
 */
export interface UpdateEntitlementReqCommon {
  /**
   *
   * @type {string}
   * @memberof UpdateEntitlementReqCommon
   */
  meteredMonthlyPriceId?: string | null;
  /**
   *
   * @type {string}
   * @memberof UpdateEntitlementReqCommon
   */
  meteredYearlyPriceId?: string | null;
  /**
   *
   * @type {string}
   * @memberof UpdateEntitlementReqCommon
   */
  metricPeriod?: UpdateEntitlementReqCommonMetricPeriodEnum | null;
  /**
   *
   * @type {string}
   * @memberof UpdateEntitlementReqCommon
   */
  metricPeriodMonthReset?: UpdateEntitlementReqCommonMetricPeriodMonthResetEnum | null;
  /**
   *
   * @type {boolean}
   * @memberof UpdateEntitlementReqCommon
   */
  valueBool?: boolean | null;
  /**
   *
   * @type {number}
   * @memberof UpdateEntitlementReqCommon
   */
  valueNumeric?: number | null;
  /**
   *
   * @type {string}
   * @memberof UpdateEntitlementReqCommon
   */
  valueTraitId?: string | null;
  /**
   *
   * @type {string}
   * @memberof UpdateEntitlementReqCommon
   */
  valueType: UpdateEntitlementReqCommonValueTypeEnum;
}

/**
 * @export
 */
export const UpdateEntitlementReqCommonMetricPeriodEnum = {
  AllTime: "all_time",
  Billing: "billing",
  CurrentMonth: "current_month",
  CurrentWeek: "current_week",
  CurrentDay: "current_day",
} as const;
export type UpdateEntitlementReqCommonMetricPeriodEnum =
  (typeof UpdateEntitlementReqCommonMetricPeriodEnum)[keyof typeof UpdateEntitlementReqCommonMetricPeriodEnum];

/**
 * @export
 */
export const UpdateEntitlementReqCommonMetricPeriodMonthResetEnum = {
  FirstOfMonth: "first_of_month",
  BillingCycle: "billing_cycle",
} as const;
export type UpdateEntitlementReqCommonMetricPeriodMonthResetEnum =
  (typeof UpdateEntitlementReqCommonMetricPeriodMonthResetEnum)[keyof typeof UpdateEntitlementReqCommonMetricPeriodMonthResetEnum];

/**
 * @export
 */
export const UpdateEntitlementReqCommonValueTypeEnum = {
  Boolean: "boolean",
  Numeric: "numeric",
  Trait: "trait",
  Unlimited: "unlimited",
} as const;
export type UpdateEntitlementReqCommonValueTypeEnum =
  (typeof UpdateEntitlementReqCommonValueTypeEnum)[keyof typeof UpdateEntitlementReqCommonValueTypeEnum];

/**
 * Check if a given object implements the UpdateEntitlementReqCommon interface.
 */
export function instanceOfUpdateEntitlementReqCommon(
  value: object,
): value is UpdateEntitlementReqCommon {
  if (!("valueType" in value) || value["valueType"] === undefined) return false;
  return true;
}

export function UpdateEntitlementReqCommonFromJSON(
  json: any,
): UpdateEntitlementReqCommon {
  return UpdateEntitlementReqCommonFromJSONTyped(json, false);
}

export function UpdateEntitlementReqCommonFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): UpdateEntitlementReqCommon {
  if (json == null) {
    return json;
  }
  return {
    meteredMonthlyPriceId:
      json["metered_monthly_price_id"] == null
        ? undefined
        : json["metered_monthly_price_id"],
    meteredYearlyPriceId:
      json["metered_yearly_price_id"] == null
        ? undefined
        : json["metered_yearly_price_id"],
    metricPeriod:
      json["metric_period"] == null ? undefined : json["metric_period"],
    metricPeriodMonthReset:
      json["metric_period_month_reset"] == null
        ? undefined
        : json["metric_period_month_reset"],
    valueBool: json["value_bool"] == null ? undefined : json["value_bool"],
    valueNumeric:
      json["value_numeric"] == null ? undefined : json["value_numeric"],
    valueTraitId:
      json["value_trait_id"] == null ? undefined : json["value_trait_id"],
    valueType: json["value_type"],
  };
}

export function UpdateEntitlementReqCommonToJSON(
  json: any,
): UpdateEntitlementReqCommon {
  return UpdateEntitlementReqCommonToJSONTyped(json, false);
}

export function UpdateEntitlementReqCommonToJSONTyped(
  value?: UpdateEntitlementReqCommon | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    metered_monthly_price_id: value["meteredMonthlyPriceId"],
    metered_yearly_price_id: value["meteredYearlyPriceId"],
    metric_period: value["metricPeriod"],
    metric_period_month_reset: value["metricPeriodMonthReset"],
    value_bool: value["valueBool"],
    value_numeric: value["valueNumeric"],
    value_trait_id: value["valueTraitId"],
    value_type: value["valueType"],
  };
}
