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
 * @interface CreateCompanyOverrideRequestBody
 */
export interface CreateCompanyOverrideRequestBody {
  /**
   *
   * @type {string}
   * @memberof CreateCompanyOverrideRequestBody
   */
  companyId: string;
  /**
   *
   * @type {Date}
   * @memberof CreateCompanyOverrideRequestBody
   */
  expirationDate?: Date | null;
  /**
   *
   * @type {string}
   * @memberof CreateCompanyOverrideRequestBody
   */
  featureId: string;
  /**
   *
   * @type {string}
   * @memberof CreateCompanyOverrideRequestBody
   */
  meteredMonthlyPriceId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateCompanyOverrideRequestBody
   */
  meteredYearlyPriceId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateCompanyOverrideRequestBody
   */
  metricPeriod?: CreateCompanyOverrideRequestBodyMetricPeriodEnum | null;
  /**
   *
   * @type {string}
   * @memberof CreateCompanyOverrideRequestBody
   */
  metricPeriodMonthReset?: CreateCompanyOverrideRequestBodyMetricPeriodMonthResetEnum | null;
  /**
   *
   * @type {boolean}
   * @memberof CreateCompanyOverrideRequestBody
   */
  valueBool?: boolean | null;
  /**
   *
   * @type {number}
   * @memberof CreateCompanyOverrideRequestBody
   */
  valueNumeric?: number | null;
  /**
   *
   * @type {string}
   * @memberof CreateCompanyOverrideRequestBody
   */
  valueTraitId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateCompanyOverrideRequestBody
   */
  valueType: CreateCompanyOverrideRequestBodyValueTypeEnum;
}

/**
 * @export
 */
export const CreateCompanyOverrideRequestBodyMetricPeriodEnum = {
  AllTime: "all_time",
  Billing: "billing",
  CurrentMonth: "current_month",
  CurrentWeek: "current_week",
  CurrentDay: "current_day",
} as const;
export type CreateCompanyOverrideRequestBodyMetricPeriodEnum =
  (typeof CreateCompanyOverrideRequestBodyMetricPeriodEnum)[keyof typeof CreateCompanyOverrideRequestBodyMetricPeriodEnum];

/**
 * @export
 */
export const CreateCompanyOverrideRequestBodyMetricPeriodMonthResetEnum = {
  FirstOfMonth: "first_of_month",
  BillingCycle: "billing_cycle",
} as const;
export type CreateCompanyOverrideRequestBodyMetricPeriodMonthResetEnum =
  (typeof CreateCompanyOverrideRequestBodyMetricPeriodMonthResetEnum)[keyof typeof CreateCompanyOverrideRequestBodyMetricPeriodMonthResetEnum];

/**
 * @export
 */
export const CreateCompanyOverrideRequestBodyValueTypeEnum = {
  Boolean: "boolean",
  Numeric: "numeric",
  Trait: "trait",
  Unlimited: "unlimited",
} as const;
export type CreateCompanyOverrideRequestBodyValueTypeEnum =
  (typeof CreateCompanyOverrideRequestBodyValueTypeEnum)[keyof typeof CreateCompanyOverrideRequestBodyValueTypeEnum];

/**
 * Check if a given object implements the CreateCompanyOverrideRequestBody interface.
 */
export function instanceOfCreateCompanyOverrideRequestBody(
  value: object,
): value is CreateCompanyOverrideRequestBody {
  if (!("companyId" in value) || value["companyId"] === undefined) return false;
  if (!("featureId" in value) || value["featureId"] === undefined) return false;
  if (!("valueType" in value) || value["valueType"] === undefined) return false;
  return true;
}

export function CreateCompanyOverrideRequestBodyFromJSON(
  json: any,
): CreateCompanyOverrideRequestBody {
  return CreateCompanyOverrideRequestBodyFromJSONTyped(json, false);
}

export function CreateCompanyOverrideRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateCompanyOverrideRequestBody {
  if (json == null) {
    return json;
  }
  return {
    companyId: json["company_id"],
    expirationDate:
      json["expiration_date"] == null
        ? undefined
        : new Date(json["expiration_date"]),
    featureId: json["feature_id"],
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

export function CreateCompanyOverrideRequestBodyToJSON(
  json: any,
): CreateCompanyOverrideRequestBody {
  return CreateCompanyOverrideRequestBodyToJSONTyped(json, false);
}

export function CreateCompanyOverrideRequestBodyToJSONTyped(
  value?: CreateCompanyOverrideRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    company_id: value["companyId"],
    expiration_date:
      value["expirationDate"] == null
        ? undefined
        : (value["expirationDate"] as any).toISOString(),
    feature_id: value["featureId"],
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
