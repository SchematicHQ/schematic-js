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
import type { BillingProductForSubscriptionResponseData } from "./BillingProductForSubscriptionResponseData";
import {
  BillingProductForSubscriptionResponseDataFromJSON,
  BillingProductForSubscriptionResponseDataFromJSONTyped,
  BillingProductForSubscriptionResponseDataToJSON,
} from "./BillingProductForSubscriptionResponseData";
import type { BillingSubscriptionDiscountView } from "./BillingSubscriptionDiscountView";
import {
  BillingSubscriptionDiscountViewFromJSON,
  BillingSubscriptionDiscountViewFromJSONTyped,
  BillingSubscriptionDiscountViewToJSON,
} from "./BillingSubscriptionDiscountView";
import type { InvoiceResponseData } from "./InvoiceResponseData";
import {
  InvoiceResponseDataFromJSON,
  InvoiceResponseDataFromJSONTyped,
  InvoiceResponseDataToJSON,
} from "./InvoiceResponseData";
import type { PaymentMethodResponseData } from "./PaymentMethodResponseData";
import {
  PaymentMethodResponseDataFromJSON,
  PaymentMethodResponseDataFromJSONTyped,
  PaymentMethodResponseDataToJSON,
} from "./PaymentMethodResponseData";

/**
 *
 * @export
 * @interface BillingSubscriptionView
 */
export interface BillingSubscriptionView {
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionView
   */
  companyId?: string | null;
  /**
   *
   * @type {Date}
   * @memberof BillingSubscriptionView
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionView
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionView
   */
  customerExternalId: string;
  /**
   *
   * @type {Array<BillingSubscriptionDiscountView>}
   * @memberof BillingSubscriptionView
   */
  discounts: Array<BillingSubscriptionDiscountView>;
  /**
   *
   * @type {Date}
   * @memberof BillingSubscriptionView
   */
  expiredAt?: Date | null;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionView
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionView
   */
  interval: string;
  /**
   *
   * @type {InvoiceResponseData}
   * @memberof BillingSubscriptionView
   */
  latestInvoice?: InvoiceResponseData;
  /**
   *
   * @type {object}
   * @memberof BillingSubscriptionView
   */
  metadata?: object;
  /**
   *
   * @type {PaymentMethodResponseData}
   * @memberof BillingSubscriptionView
   */
  paymentMethod?: PaymentMethodResponseData;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionView
   */
  periodEnd: number;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionView
   */
  periodStart: number;
  /**
   *
   * @type {Array<BillingProductForSubscriptionResponseData>}
   * @memberof BillingSubscriptionView
   */
  products: Array<BillingProductForSubscriptionResponseData>;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionView
   */
  status: string;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionView
   */
  subscriptionExternalId: string;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionView
   */
  totalPrice: number;
  /**
   *
   * @type {number}
   * @memberof BillingSubscriptionView
   */
  trialEnd?: number | null;
  /**
   *
   * @type {string}
   * @memberof BillingSubscriptionView
   */
  trialEndSetting?: string | null;
}

/**
 * Check if a given object implements the BillingSubscriptionView interface.
 */
export function instanceOfBillingSubscriptionView(
  value: object,
): value is BillingSubscriptionView {
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (
    !("customerExternalId" in value) ||
    value["customerExternalId"] === undefined
  )
    return false;
  if (!("discounts" in value) || value["discounts"] === undefined) return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("interval" in value) || value["interval"] === undefined) return false;
  if (!("periodEnd" in value) || value["periodEnd"] === undefined) return false;
  if (!("periodStart" in value) || value["periodStart"] === undefined)
    return false;
  if (!("products" in value) || value["products"] === undefined) return false;
  if (!("status" in value) || value["status"] === undefined) return false;
  if (
    !("subscriptionExternalId" in value) ||
    value["subscriptionExternalId"] === undefined
  )
    return false;
  if (!("totalPrice" in value) || value["totalPrice"] === undefined)
    return false;
  return true;
}

export function BillingSubscriptionViewFromJSON(
  json: any,
): BillingSubscriptionView {
  return BillingSubscriptionViewFromJSONTyped(json, false);
}

export function BillingSubscriptionViewFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): BillingSubscriptionView {
  if (json == null) {
    return json;
  }
  return {
    companyId: json["company_id"] == null ? undefined : json["company_id"],
    createdAt: new Date(json["created_at"]),
    currency: json["currency"],
    customerExternalId: json["customer_external_id"],
    discounts: (json["discounts"] as Array<any>).map(
      BillingSubscriptionDiscountViewFromJSON,
    ),
    expiredAt:
      json["expired_at"] == null ? undefined : new Date(json["expired_at"]),
    id: json["id"],
    interval: json["interval"],
    latestInvoice:
      json["latest_invoice"] == null
        ? undefined
        : InvoiceResponseDataFromJSON(json["latest_invoice"]),
    metadata: json["metadata"] == null ? undefined : json["metadata"],
    paymentMethod:
      json["payment_method"] == null
        ? undefined
        : PaymentMethodResponseDataFromJSON(json["payment_method"]),
    periodEnd: json["period_end"],
    periodStart: json["period_start"],
    products: (json["products"] as Array<any>).map(
      BillingProductForSubscriptionResponseDataFromJSON,
    ),
    status: json["status"],
    subscriptionExternalId: json["subscription_external_id"],
    totalPrice: json["total_price"],
    trialEnd: json["trial_end"] == null ? undefined : json["trial_end"],
    trialEndSetting:
      json["trial_end_setting"] == null ? undefined : json["trial_end_setting"],
  };
}

export function BillingSubscriptionViewToJSON(
  value?: BillingSubscriptionView | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    company_id: value["companyId"],
    created_at: value["createdAt"].toISOString(),
    currency: value["currency"],
    customer_external_id: value["customerExternalId"],
    discounts: (value["discounts"] as Array<any>).map(
      BillingSubscriptionDiscountViewToJSON,
    ),
    expired_at:
      value["expiredAt"] == null
        ? undefined
        : (value["expiredAt"] as any).toISOString(),
    id: value["id"],
    interval: value["interval"],
    latest_invoice: InvoiceResponseDataToJSON(value["latestInvoice"]),
    metadata: value["metadata"],
    payment_method: PaymentMethodResponseDataToJSON(value["paymentMethod"]),
    period_end: value["periodEnd"],
    period_start: value["periodStart"],
    products: (value["products"] as Array<any>).map(
      BillingProductForSubscriptionResponseDataToJSON,
    ),
    status: value["status"],
    subscription_external_id: value["subscriptionExternalId"],
    total_price: value["totalPrice"],
    trial_end: value["trialEnd"],
    trial_end_setting: value["trialEndSetting"],
  };
}
