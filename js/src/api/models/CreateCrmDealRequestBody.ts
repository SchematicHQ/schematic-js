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
 * @interface CreateCrmDealRequestBody
 */
export interface CreateCrmDealRequestBody {
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  arr?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  crmCompanyId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  crmCompanyKey: string;
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  crmProductId?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  crmType: string;
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  dealExternalId: string;
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  dealName?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  dealStage?: string | null;
  /**
   *
   * @type {string}
   * @memberof CreateCrmDealRequestBody
   */
  mrr?: string | null;
}

/**
 * Check if a given object implements the CreateCrmDealRequestBody interface.
 */
export function instanceOfCreateCrmDealRequestBody(
  value: object,
): value is CreateCrmDealRequestBody {
  if (!("crmCompanyKey" in value) || value["crmCompanyKey"] === undefined)
    return false;
  if (!("crmType" in value) || value["crmType"] === undefined) return false;
  if (!("dealExternalId" in value) || value["dealExternalId"] === undefined)
    return false;
  return true;
}

export function CreateCrmDealRequestBodyFromJSON(
  json: any,
): CreateCrmDealRequestBody {
  return CreateCrmDealRequestBodyFromJSONTyped(json, false);
}

export function CreateCrmDealRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CreateCrmDealRequestBody {
  if (json == null) {
    return json;
  }
  return {
    arr: json["arr"] == null ? undefined : json["arr"],
    crmCompanyId:
      json["crm_company_id"] == null ? undefined : json["crm_company_id"],
    crmCompanyKey: json["crm_company_key"],
    crmProductId:
      json["crm_product_id"] == null ? undefined : json["crm_product_id"],
    crmType: json["crm_type"],
    dealExternalId: json["deal_external_id"],
    dealName: json["deal_name"] == null ? undefined : json["deal_name"],
    dealStage: json["deal_stage"] == null ? undefined : json["deal_stage"],
    mrr: json["mrr"] == null ? undefined : json["mrr"],
  };
}

export function CreateCrmDealRequestBodyToJSON(
  json: any,
): CreateCrmDealRequestBody {
  return CreateCrmDealRequestBodyToJSONTyped(json, false);
}

export function CreateCrmDealRequestBodyToJSONTyped(
  value?: CreateCrmDealRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    arr: value["arr"],
    crm_company_id: value["crmCompanyId"],
    crm_company_key: value["crmCompanyKey"],
    crm_product_id: value["crmProductId"],
    crm_type: value["crmType"],
    deal_external_id: value["dealExternalId"],
    deal_name: value["dealName"],
    deal_stage: value["dealStage"],
    mrr: value["mrr"],
  };
}
