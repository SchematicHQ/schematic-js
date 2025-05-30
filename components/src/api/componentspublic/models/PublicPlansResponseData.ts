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
import type { ComponentCapabilities } from "./ComponentCapabilities";
import {
  ComponentCapabilitiesFromJSON,
  ComponentCapabilitiesFromJSONTyped,
  ComponentCapabilitiesToJSON,
} from "./ComponentCapabilities";
import type { PlanViewPublicResponseData } from "./PlanViewPublicResponseData";
import {
  PlanViewPublicResponseDataFromJSON,
  PlanViewPublicResponseDataFromJSONTyped,
  PlanViewPublicResponseDataToJSON,
} from "./PlanViewPublicResponseData";

/**
 * The returned resource
 * @export
 * @interface PublicPlansResponseData
 */
export interface PublicPlansResponseData {
  /**
   *
   * @type {Array<PlanViewPublicResponseData>}
   * @memberof PublicPlansResponseData
   */
  activeAddOns: Array<PlanViewPublicResponseData>;
  /**
   *
   * @type {Array<PlanViewPublicResponseData>}
   * @memberof PublicPlansResponseData
   */
  activePlans: Array<PlanViewPublicResponseData>;
  /**
   *
   * @type {ComponentCapabilities}
   * @memberof PublicPlansResponseData
   */
  capabilities?: ComponentCapabilities;
}

/**
 * Check if a given object implements the PublicPlansResponseData interface.
 */
export function instanceOfPublicPlansResponseData(
  value: object,
): value is PublicPlansResponseData {
  if (!("activeAddOns" in value) || value["activeAddOns"] === undefined)
    return false;
  if (!("activePlans" in value) || value["activePlans"] === undefined)
    return false;
  return true;
}

export function PublicPlansResponseDataFromJSON(
  json: any,
): PublicPlansResponseData {
  return PublicPlansResponseDataFromJSONTyped(json, false);
}

export function PublicPlansResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): PublicPlansResponseData {
  if (json == null) {
    return json;
  }
  return {
    activeAddOns: (json["active_add_ons"] as Array<any>).map(
      PlanViewPublicResponseDataFromJSON,
    ),
    activePlans: (json["active_plans"] as Array<any>).map(
      PlanViewPublicResponseDataFromJSON,
    ),
    capabilities:
      json["capabilities"] == null
        ? undefined
        : ComponentCapabilitiesFromJSON(json["capabilities"]),
  };
}

export function PublicPlansResponseDataToJSON(
  value?: PublicPlansResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    active_add_ons: (value["activeAddOns"] as Array<any>).map(
      PlanViewPublicResponseDataToJSON,
    ),
    active_plans: (value["activePlans"] as Array<any>).map(
      PlanViewPublicResponseDataToJSON,
    ),
    capabilities: ComponentCapabilitiesToJSON(value["capabilities"]),
  };
}
