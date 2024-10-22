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
import type { CompanyPlanDetailResponseData } from "./CompanyPlanDetailResponseData";
import {
  CompanyPlanDetailResponseDataFromJSON,
  CompanyPlanDetailResponseDataFromJSONTyped,
  CompanyPlanDetailResponseDataToJSON,
} from "./CompanyPlanDetailResponseData";
import type { ComponentResponseData } from "./ComponentResponseData";
import {
  ComponentResponseDataFromJSON,
  ComponentResponseDataFromJSONTyped,
  ComponentResponseDataToJSON,
} from "./ComponentResponseData";
import type { FeatureUsageDetailResponseData } from "./FeatureUsageDetailResponseData";
import {
  FeatureUsageDetailResponseDataFromJSON,
  FeatureUsageDetailResponseDataFromJSONTyped,
  FeatureUsageDetailResponseDataToJSON,
} from "./FeatureUsageDetailResponseData";
import type { StripeEmbedInfo } from "./StripeEmbedInfo";
import {
  StripeEmbedInfoFromJSON,
  StripeEmbedInfoFromJSONTyped,
  StripeEmbedInfoToJSON,
} from "./StripeEmbedInfo";
import type { CompanyDetailResponseData } from "./CompanyDetailResponseData";
import {
  CompanyDetailResponseDataFromJSON,
  CompanyDetailResponseDataFromJSONTyped,
  CompanyDetailResponseDataToJSON,
} from "./CompanyDetailResponseData";
import type { InvoiceResponseData } from "./InvoiceResponseData";
import {
  InvoiceResponseDataFromJSON,
  InvoiceResponseDataFromJSONTyped,
  InvoiceResponseDataToJSON,
} from "./InvoiceResponseData";
import type { CompanySubscriptionResponseData } from "./CompanySubscriptionResponseData";
import {
  CompanySubscriptionResponseDataFromJSON,
  CompanySubscriptionResponseDataFromJSONTyped,
  CompanySubscriptionResponseDataToJSON,
} from "./CompanySubscriptionResponseData";

/**
 * The returned resource
 * @export
 * @interface ComponentHydrateResponseData
 */
export interface ComponentHydrateResponseData {
  /**
   *
   * @type {Array<CompanyPlanDetailResponseData>}
   * @memberof ComponentHydrateResponseData
   */
  activeAddOns: Array<CompanyPlanDetailResponseData>;
  /**
   *
   * @type {Array<CompanyPlanDetailResponseData>}
   * @memberof ComponentHydrateResponseData
   */
  activePlans: Array<CompanyPlanDetailResponseData>;
  /**
   *
   * @type {CompanyDetailResponseData}
   * @memberof ComponentHydrateResponseData
   */
  company?: CompanyDetailResponseData;
  /**
   *
   * @type {ComponentResponseData}
   * @memberof ComponentHydrateResponseData
   */
  component?: ComponentResponseData;
  /**
   *
   * @type {FeatureUsageDetailResponseData}
   * @memberof ComponentHydrateResponseData
   */
  featureUsage?: FeatureUsageDetailResponseData;
  /**
   *
   * @type {StripeEmbedInfo}
   * @memberof ComponentHydrateResponseData
   */
  stripeEmbed?: StripeEmbedInfo;
  /**
   *
   * @type {CompanySubscriptionResponseData}
   * @memberof ComponentHydrateResponseData
   */
  subscription?: CompanySubscriptionResponseData;
  /**
   *
   * @type {InvoiceResponseData}
   * @memberof ComponentHydrateResponseData
   */
  upcomingInvoice?: InvoiceResponseData;
}

/**
 * Check if a given object implements the ComponentHydrateResponseData interface.
 */
export function instanceOfComponentHydrateResponseData(
  value: object,
): value is ComponentHydrateResponseData {
  if (!("activeAddOns" in value) || value["activeAddOns"] === undefined)
    return false;
  if (!("activePlans" in value) || value["activePlans"] === undefined)
    return false;
  return true;
}

export function ComponentHydrateResponseDataFromJSON(
  json: any,
): ComponentHydrateResponseData {
  return ComponentHydrateResponseDataFromJSONTyped(json, false);
}

export function ComponentHydrateResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ComponentHydrateResponseData {
  if (json == null) {
    return json;
  }
  return {
    activeAddOns: (json["ActiveAddOns"] as Array<any>).map(
      CompanyPlanDetailResponseDataFromJSON,
    ),
    activePlans: (json["active_plans"] as Array<any>).map(
      CompanyPlanDetailResponseDataFromJSON,
    ),
    company:
      json["company"] == null
        ? undefined
        : CompanyDetailResponseDataFromJSON(json["company"]),
    component:
      json["component"] == null
        ? undefined
        : ComponentResponseDataFromJSON(json["component"]),
    featureUsage:
      json["feature_usage"] == null
        ? undefined
        : FeatureUsageDetailResponseDataFromJSON(json["feature_usage"]),
    stripeEmbed:
      json["stripe_embed"] == null
        ? undefined
        : StripeEmbedInfoFromJSON(json["stripe_embed"]),
    subscription:
      json["subscription"] == null
        ? undefined
        : CompanySubscriptionResponseDataFromJSON(json["subscription"]),
    upcomingInvoice:
      json["upcoming_invoice"] == null
        ? undefined
        : InvoiceResponseDataFromJSON(json["upcoming_invoice"]),
  };
}

export function ComponentHydrateResponseDataToJSON(
  value?: ComponentHydrateResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    ActiveAddOns: (value["activeAddOns"] as Array<any>).map(
      CompanyPlanDetailResponseDataToJSON,
    ),
    active_plans: (value["activePlans"] as Array<any>).map(
      CompanyPlanDetailResponseDataToJSON,
    ),
    company: CompanyDetailResponseDataToJSON(value["company"]),
    component: ComponentResponseDataToJSON(value["component"]),
    feature_usage: FeatureUsageDetailResponseDataToJSON(value["featureUsage"]),
    stripe_embed: StripeEmbedInfoToJSON(value["stripeEmbed"]),
    subscription: CompanySubscriptionResponseDataToJSON(value["subscription"]),
    upcoming_invoice: InvoiceResponseDataToJSON(value["upcomingInvoice"]),
  };
}
