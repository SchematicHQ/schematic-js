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
 * @interface UpdateWebhookRequestBody
 */
export interface UpdateWebhookRequestBody {
  /**
   *
   * @type {string}
   * @memberof UpdateWebhookRequestBody
   */
  name?: string | null;
  /**
   *
   * @type {Array<string>}
   * @memberof UpdateWebhookRequestBody
   */
  requestTypes?: Array<UpdateWebhookRequestBodyRequestTypesEnum> | null;
  /**
   *
   * @type {string}
   * @memberof UpdateWebhookRequestBody
   */
  status?: UpdateWebhookRequestBodyStatusEnum | null;
  /**
   *
   * @type {string}
   * @memberof UpdateWebhookRequestBody
   */
  url?: string | null;
}

/**
 * @export
 */
export const UpdateWebhookRequestBodyRequestTypesEnum = {
  CompanyUpdated: "company.updated",
  UserUpdated: "user.updated",
  PlanUpdated: "plan.updated",
  PlanEntitlementUpdated: "plan.entitlement.updated",
  CompanyOverrideUpdated: "company.override.updated",
  FeatureUpdated: "feature.updated",
  FlagUpdated: "flag.updated",
  FlagRulesUpdated: "flag_rules.updated",
  CompanyCreated: "company.created",
  UserCreated: "user.created",
  PlanCreated: "plan.created",
  PlanEntitlementCreated: "plan.entitlement.created",
  CompanyOverrideCreated: "company.override.created",
  FeatureCreated: "feature.created",
  FlagCreated: "flag.created",
  CompanyDeleted: "company.deleted",
  UserDeleted: "user.deleted",
  PlanDeleted: "plan.deleted",
  PlanEntitlementDeleted: "plan.entitlement.deleted",
  CompanyOverrideDeleted: "company.override.deleted",
  FeatureDeleted: "feature.deleted",
  FlagDeleted: "flag.deleted",
  TestSend: "test.send",
} as const;
export type UpdateWebhookRequestBodyRequestTypesEnum =
  (typeof UpdateWebhookRequestBodyRequestTypesEnum)[keyof typeof UpdateWebhookRequestBodyRequestTypesEnum];

/**
 * @export
 */
export const UpdateWebhookRequestBodyStatusEnum = {
  Active: "active",
  Inactive: "inactive",
} as const;
export type UpdateWebhookRequestBodyStatusEnum =
  (typeof UpdateWebhookRequestBodyStatusEnum)[keyof typeof UpdateWebhookRequestBodyStatusEnum];

/**
 * Check if a given object implements the UpdateWebhookRequestBody interface.
 */
export function instanceOfUpdateWebhookRequestBody(
  value: object,
): value is UpdateWebhookRequestBody {
  return true;
}

export function UpdateWebhookRequestBodyFromJSON(
  json: any,
): UpdateWebhookRequestBody {
  return UpdateWebhookRequestBodyFromJSONTyped(json, false);
}

export function UpdateWebhookRequestBodyFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): UpdateWebhookRequestBody {
  if (json == null) {
    return json;
  }
  return {
    name: json["name"] == null ? undefined : json["name"],
    requestTypes:
      json["request_types"] == null ? undefined : json["request_types"],
    status: json["status"] == null ? undefined : json["status"],
    url: json["url"] == null ? undefined : json["url"],
  };
}

export function UpdateWebhookRequestBodyToJSON(
  json: any,
): UpdateWebhookRequestBody {
  return UpdateWebhookRequestBodyToJSONTyped(json, false);
}

export function UpdateWebhookRequestBodyToJSONTyped(
  value?: UpdateWebhookRequestBody | null,
  ignoreDiscriminator: boolean = false,
): any {
  if (value == null) {
    return value;
  }

  return {
    name: value["name"],
    request_types: value["requestTypes"],
    status: value["status"],
    url: value["url"],
  };
}
