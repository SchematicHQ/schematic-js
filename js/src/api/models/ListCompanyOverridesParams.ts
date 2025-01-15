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
 * Input parameters
 * @export
 * @interface ListCompanyOverridesParams
 */
export interface ListCompanyOverridesParams {
  /**
   * Filter company overrides by a single company ID (starting with comp_)
   * @type {string}
   * @memberof ListCompanyOverridesParams
   */
  companyId?: string;
  /**
   * Filter company overrides by multiple company IDs (starting with comp_)
   * @type {Array<string>}
   * @memberof ListCompanyOverridesParams
   */
  companyIds?: Array<string>;
  /**
   * Filter company overrides by a single feature ID (starting with feat_)
   * @type {string}
   * @memberof ListCompanyOverridesParams
   */
  featureId?: string;
  /**
   * Filter company overrides by multiple feature IDs (starting with feat_)
   * @type {Array<string>}
   * @memberof ListCompanyOverridesParams
   */
  featureIds?: Array<string>;
  /**
   * Filter company overrides by multiple company override IDs (starting with cmov_)
   * @type {Array<string>}
   * @memberof ListCompanyOverridesParams
   */
  ids?: Array<string>;
  /**
   * Page limit (default 100)
   * @type {number}
   * @memberof ListCompanyOverridesParams
   */
  limit?: number;
  /**
   * Page offset (default 0)
   * @type {number}
   * @memberof ListCompanyOverridesParams
   */
  offset?: number;
  /**
   * Search for company overrides by feature or company name
   * @type {string}
   * @memberof ListCompanyOverridesParams
   */
  q?: string;
}

/**
 * Check if a given object implements the ListCompanyOverridesParams interface.
 */
export function instanceOfListCompanyOverridesParams(
  value: object,
): value is ListCompanyOverridesParams {
  return true;
}

export function ListCompanyOverridesParamsFromJSON(
  json: any,
): ListCompanyOverridesParams {
  return ListCompanyOverridesParamsFromJSONTyped(json, false);
}

export function ListCompanyOverridesParamsFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ListCompanyOverridesParams {
  if (json == null) {
    return json;
  }
  return {
    companyId: json["company_id"] == null ? undefined : json["company_id"],
    companyIds: json["company_ids"] == null ? undefined : json["company_ids"],
    featureId: json["feature_id"] == null ? undefined : json["feature_id"],
    featureIds: json["feature_ids"] == null ? undefined : json["feature_ids"],
    ids: json["ids"] == null ? undefined : json["ids"],
    limit: json["limit"] == null ? undefined : json["limit"],
    offset: json["offset"] == null ? undefined : json["offset"],
    q: json["q"] == null ? undefined : json["q"],
  };
}

export function ListCompanyOverridesParamsToJSON(
  json: any,
): ListCompanyOverridesParams {
  return ListCompanyOverridesParamsToJSONTyped(json, false);
}

export function ListCompanyOverridesParamsToJSONTyped(
  value?: ListCompanyOverridesParams | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    company_id: value["companyId"],
    company_ids: value["companyIds"],
    feature_id: value["featureId"],
    feature_ids: value["featureIds"],
    ids: value["ids"],
    limit: value["limit"],
    offset: value["offset"],
    q: value["q"],
  };
}
