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
 * @interface CompanyPlanWithBillingSubView
 */
export interface CompanyPlanWithBillingSubView {
  /**
   *
   * @type {Date}
   * @memberof CompanyPlanWithBillingSubView
   */
  addedOn?: Date | null;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanWithBillingSubView
   */
  billingProductExternalId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanWithBillingSubView
   */
  billingProductId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanWithBillingSubView
   */
  description?: string | null;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanWithBillingSubView
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanWithBillingSubView
   */
  imageUrl?: string | null;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanWithBillingSubView
   */
  name: string;
  /**
   *
   * @type {string}
   * @memberof CompanyPlanWithBillingSubView
   */
  planPeriod?: string | null;
  /**
   *
   * @type {number}
   * @memberof CompanyPlanWithBillingSubView
   */
  planPrice?: number | null;
}

/**
 * Check if a given object implements the CompanyPlanWithBillingSubView interface.
 */
export function instanceOfCompanyPlanWithBillingSubView(
  value: object,
): value is CompanyPlanWithBillingSubView {
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  return true;
}

export function CompanyPlanWithBillingSubViewFromJSON(
  json: any,
): CompanyPlanWithBillingSubView {
  return CompanyPlanWithBillingSubViewFromJSONTyped(json, false);
}

export function CompanyPlanWithBillingSubViewFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CompanyPlanWithBillingSubView {
  if (json == null) {
    return json;
  }
  return {
    addedOn: json["added_on"] == null ? undefined : new Date(json["added_on"]),
    billingProductExternalId:
      json["billing_product_external_id"] == null
        ? undefined
        : json["billing_product_external_id"],
    billingProductId:
      json["billing_product_id"] == null
        ? undefined
        : json["billing_product_id"],
    description: json["description"] == null ? undefined : json["description"],
    id: json["id"],
    imageUrl: json["image_url"] == null ? undefined : json["image_url"],
    name: json["name"],
    planPeriod: json["plan_period"] == null ? undefined : json["plan_period"],
    planPrice: json["plan_price"] == null ? undefined : json["plan_price"],
  };
}

export function CompanyPlanWithBillingSubViewToJSON(
  value?: CompanyPlanWithBillingSubView | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    added_on:
      value["addedOn"] == null
        ? undefined
        : (value["addedOn"] as any).toISOString(),
    billing_product_external_id: value["billingProductExternalId"],
    billing_product_id: value["billingProductId"],
    description: value["description"],
    id: value["id"],
    image_url: value["imageUrl"],
    name: value["name"],
    plan_period: value["planPeriod"],
    plan_price: value["planPrice"],
  };
}
