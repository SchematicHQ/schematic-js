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
 * @interface CompanyEventPeriodMetricsResponseData
 */
export interface CompanyEventPeriodMetricsResponseData {
  /**
   *
   * @type {string}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  accountId: string;
  /**
   *
   * @type {Date}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  capturedAtMax: Date;
  /**
   *
   * @type {Date}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  capturedAtMin: Date;
  /**
   *
   * @type {string}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  companyId: string;
  /**
   *
   * @type {Date}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  eventSubtype: string;
  /**
   *
   * @type {string}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  monthReset: string;
  /**
   *
   * @type {string}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  period: string;
  /**
   *
   * @type {Date}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  validUntil?: Date | null;
  /**
   *
   * @type {number}
   * @memberof CompanyEventPeriodMetricsResponseData
   */
  value: number;
}

/**
 * Check if a given object implements the CompanyEventPeriodMetricsResponseData interface.
 */
export function instanceOfCompanyEventPeriodMetricsResponseData(
  value: object,
): value is CompanyEventPeriodMetricsResponseData {
  if (!("accountId" in value) || value["accountId"] === undefined) return false;
  if (!("capturedAtMax" in value) || value["capturedAtMax"] === undefined)
    return false;
  if (!("capturedAtMin" in value) || value["capturedAtMin"] === undefined)
    return false;
  if (!("companyId" in value) || value["companyId"] === undefined) return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("eventSubtype" in value) || value["eventSubtype"] === undefined)
    return false;
  if (!("monthReset" in value) || value["monthReset"] === undefined)
    return false;
  if (!("period" in value) || value["period"] === undefined) return false;
  if (!("value" in value) || value["value"] === undefined) return false;
  return true;
}

export function CompanyEventPeriodMetricsResponseDataFromJSON(
  json: any,
): CompanyEventPeriodMetricsResponseData {
  return CompanyEventPeriodMetricsResponseDataFromJSONTyped(json, false);
}

export function CompanyEventPeriodMetricsResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CompanyEventPeriodMetricsResponseData {
  if (json == null) {
    return json;
  }
  return {
    accountId: json["account_id"],
    capturedAtMax: new Date(json["captured_at_max"]),
    capturedAtMin: new Date(json["captured_at_min"]),
    companyId: json["company_id"],
    createdAt: new Date(json["created_at"]),
    environmentId: json["environment_id"],
    eventSubtype: json["event_subtype"],
    monthReset: json["month_reset"],
    period: json["period"],
    validUntil:
      json["valid_until"] == null ? undefined : new Date(json["valid_until"]),
    value: json["value"],
  };
}

export function CompanyEventPeriodMetricsResponseDataToJSON(
  value?: CompanyEventPeriodMetricsResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    account_id: value["accountId"],
    captured_at_max: value["capturedAtMax"].toISOString(),
    captured_at_min: value["capturedAtMin"].toISOString(),
    company_id: value["companyId"],
    created_at: value["createdAt"].toISOString(),
    environment_id: value["environmentId"],
    event_subtype: value["eventSubtype"],
    month_reset: value["monthReset"],
    period: value["period"],
    valid_until:
      value["validUntil"] == null
        ? undefined
        : (value["validUntil"] as any).toISOString(),
    value: value["value"],
  };
}
