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
import type { PreviewObject } from "./PreviewObject";
import {
  PreviewObjectFromJSON,
  PreviewObjectFromJSONTyped,
  PreviewObjectToJSON,
} from "./PreviewObject";
import type { EntityKeyDetailResponseData } from "./EntityKeyDetailResponseData";
import {
  EntityKeyDetailResponseDataFromJSON,
  EntityKeyDetailResponseDataFromJSONTyped,
  EntityKeyDetailResponseDataToJSON,
} from "./EntityKeyDetailResponseData";
import type { EntityTraitDetailResponseData } from "./EntityTraitDetailResponseData";
import {
  EntityTraitDetailResponseDataFromJSON,
  EntityTraitDetailResponseDataFromJSONTyped,
  EntityTraitDetailResponseDataToJSON,
} from "./EntityTraitDetailResponseData";
import type { BillingPlan } from "./BillingPlan";
import {
  BillingPlanFromJSON,
  BillingPlanFromJSONTyped,
  BillingPlanToJSON,
} from "./BillingPlan";

/**
 *
 * @export
 * @interface CompanyDetailResponseData
 */
export interface CompanyDetailResponseData {
  /**
   *
   * @type {Array<BillingPlan>}
   * @memberof CompanyDetailResponseData
   */
  addOns: Array<BillingPlan>;
  /**
   *
   * @type {Date}
   * @memberof CompanyDetailResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {Array<EntityTraitDetailResponseData>}
   * @memberof CompanyDetailResponseData
   */
  entityTraits: Array<EntityTraitDetailResponseData>;
  /**
   *
   * @type {string}
   * @memberof CompanyDetailResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof CompanyDetailResponseData
   */
  id: string;
  /**
   *
   * @type {Array<EntityKeyDetailResponseData>}
   * @memberof CompanyDetailResponseData
   */
  keys: Array<EntityKeyDetailResponseData>;
  /**
   *
   * @type {Date}
   * @memberof CompanyDetailResponseData
   */
  lastSeenAt?: Date | null;
  /**
   *
   * @type {string}
   * @memberof CompanyDetailResponseData
   */
  logoUrl?: string | null;
  /**
   *
   * @type {string}
   * @memberof CompanyDetailResponseData
   */
  name: string;
  /**
   *
   * @type {BillingPlan}
   * @memberof CompanyDetailResponseData
   */
  plan?: BillingPlan;
  /**
   *
   * @type {Array<PreviewObject>}
   * @memberof CompanyDetailResponseData
   */
  plans: Array<PreviewObject>;
  /**
   * A map of trait names to trait values
   * @type {object}
   * @memberof CompanyDetailResponseData
   */
  traits?: object;
  /**
   *
   * @type {Date}
   * @memberof CompanyDetailResponseData
   */
  updatedAt: Date;
  /**
   *
   * @type {number}
   * @memberof CompanyDetailResponseData
   */
  userCount: number;
}

/**
 * Check if a given object implements the CompanyDetailResponseData interface.
 */
export function instanceOfCompanyDetailResponseData(
  value: object,
): value is CompanyDetailResponseData {
  if (!("addOns" in value) || value["addOns"] === undefined) return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("entityTraits" in value) || value["entityTraits"] === undefined)
    return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("keys" in value) || value["keys"] === undefined) return false;
  if (!("name" in value) || value["name"] === undefined) return false;
  if (!("plans" in value) || value["plans"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  if (!("userCount" in value) || value["userCount"] === undefined) return false;
  return true;
}

export function CompanyDetailResponseDataFromJSON(
  json: any,
): CompanyDetailResponseData {
  return CompanyDetailResponseDataFromJSONTyped(json, false);
}

export function CompanyDetailResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): CompanyDetailResponseData {
  if (json == null) {
    return json;
  }
  return {
    addOns: (json["add_ons"] as Array<any>).map(BillingPlanFromJSON),
    createdAt: new Date(json["created_at"]),
    entityTraits: (json["entity_traits"] as Array<any>).map(
      EntityTraitDetailResponseDataFromJSON,
    ),
    environmentId: json["environment_id"],
    id: json["id"],
    keys: (json["keys"] as Array<any>).map(EntityKeyDetailResponseDataFromJSON),
    lastSeenAt:
      json["last_seen_at"] == null ? undefined : new Date(json["last_seen_at"]),
    logoUrl: json["logo_url"] == null ? undefined : json["logo_url"],
    name: json["name"],
    plan: json["plan"] == null ? undefined : BillingPlanFromJSON(json["plan"]),
    plans: (json["plans"] as Array<any>).map(PreviewObjectFromJSON),
    traits: json["traits"] == null ? undefined : json["traits"],
    updatedAt: new Date(json["updated_at"]),
    userCount: json["user_count"],
  };
}

export function CompanyDetailResponseDataToJSON(
  value?: CompanyDetailResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    add_ons: (value["addOns"] as Array<any>).map(BillingPlanToJSON),
    created_at: value["createdAt"].toISOString(),
    entity_traits: (value["entityTraits"] as Array<any>).map(
      EntityTraitDetailResponseDataToJSON,
    ),
    environment_id: value["environmentId"],
    id: value["id"],
    keys: (value["keys"] as Array<any>).map(EntityKeyDetailResponseDataToJSON),
    last_seen_at:
      value["lastSeenAt"] == null
        ? undefined
        : (value["lastSeenAt"] as any).toISOString(),
    logo_url: value["logoUrl"],
    name: value["name"],
    plan: BillingPlanToJSON(value["plan"]),
    plans: (value["plans"] as Array<any>).map(PreviewObjectToJSON),
    traits: value["traits"],
    updated_at: value["updatedAt"].toISOString(),
    user_count: value["userCount"],
  };
}
