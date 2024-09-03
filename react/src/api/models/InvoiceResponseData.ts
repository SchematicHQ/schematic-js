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
 * @interface InvoiceResponseData
 */
export interface InvoiceResponseData {
  /**
   *
   * @type {number}
   * @memberof InvoiceResponseData
   */
  amountDue: number;
  /**
   *
   * @type {number}
   * @memberof InvoiceResponseData
   */
  amountPaid: number;
  /**
   *
   * @type {number}
   * @memberof InvoiceResponseData
   */
  amountRemaining: number;
  /**
   *
   * @type {string}
   * @memberof InvoiceResponseData
   */
  collectionMethod: string;
  /**
   *
   * @type {string}
   * @memberof InvoiceResponseData
   */
  companyId?: string | null;
  /**
   *
   * @type {Date}
   * @memberof InvoiceResponseData
   */
  createdAt: Date;
  /**
   *
   * @type {string}
   * @memberof InvoiceResponseData
   */
  currency: string;
  /**
   *
   * @type {string}
   * @memberof InvoiceResponseData
   */
  customerExternalId: string;
  /**
   *
   * @type {Date}
   * @memberof InvoiceResponseData
   */
  dueDate?: Date | null;
  /**
   *
   * @type {string}
   * @memberof InvoiceResponseData
   */
  environmentId: string;
  /**
   *
   * @type {string}
   * @memberof InvoiceResponseData
   */
  externalId: string;
  /**
   *
   * @type {string}
   * @memberof InvoiceResponseData
   */
  id: string;
  /**
   *
   * @type {string}
   * @memberof InvoiceResponseData
   */
  subscriptionExternalId?: string | null;
  /**
   *
   * @type {number}
   * @memberof InvoiceResponseData
   */
  subtotal: number;
  /**
   *
   * @type {Date}
   * @memberof InvoiceResponseData
   */
  updatedAt: Date;
}

/**
 * Check if a given object implements the InvoiceResponseData interface.
 */
export function instanceOfInvoiceResponseData(
  value: object,
): value is InvoiceResponseData {
  if (!("amountDue" in value) || value["amountDue"] === undefined) return false;
  if (!("amountPaid" in value) || value["amountPaid"] === undefined)
    return false;
  if (!("amountRemaining" in value) || value["amountRemaining"] === undefined)
    return false;
  if (!("collectionMethod" in value) || value["collectionMethod"] === undefined)
    return false;
  if (!("createdAt" in value) || value["createdAt"] === undefined) return false;
  if (!("currency" in value) || value["currency"] === undefined) return false;
  if (
    !("customerExternalId" in value) ||
    value["customerExternalId"] === undefined
  )
    return false;
  if (!("environmentId" in value) || value["environmentId"] === undefined)
    return false;
  if (!("externalId" in value) || value["externalId"] === undefined)
    return false;
  if (!("id" in value) || value["id"] === undefined) return false;
  if (!("subtotal" in value) || value["subtotal"] === undefined) return false;
  if (!("updatedAt" in value) || value["updatedAt"] === undefined) return false;
  return true;
}

export function InvoiceResponseDataFromJSON(json: any): InvoiceResponseData {
  return InvoiceResponseDataFromJSONTyped(json, false);
}

export function InvoiceResponseDataFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): InvoiceResponseData {
  if (json == null) {
    return json;
  }
  return {
    amountDue: json["amount_due"],
    amountPaid: json["amount_paid"],
    amountRemaining: json["amount_remaining"],
    collectionMethod: json["collection_method"],
    companyId: json["company_id"] == null ? undefined : json["company_id"],
    createdAt: new Date(json["created_at"]),
    currency: json["currency"],
    customerExternalId: json["customer_external_id"],
    dueDate: json["due_date"] == null ? undefined : new Date(json["due_date"]),
    environmentId: json["environment_id"],
    externalId: json["external_id"],
    id: json["id"],
    subscriptionExternalId:
      json["subscription_external_id"] == null
        ? undefined
        : json["subscription_external_id"],
    subtotal: json["subtotal"],
    updatedAt: new Date(json["updated_at"]),
  };
}

export function InvoiceResponseDataToJSON(
  value?: InvoiceResponseData | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    amount_due: value["amountDue"],
    amount_paid: value["amountPaid"],
    amount_remaining: value["amountRemaining"],
    collection_method: value["collectionMethod"],
    company_id: value["companyId"],
    created_at: value["createdAt"].toISOString(),
    currency: value["currency"],
    customer_external_id: value["customerExternalId"],
    due_date:
      value["dueDate"] == null
        ? undefined
        : (value["dueDate"] as any).toISOString(),
    environment_id: value["environmentId"],
    external_id: value["externalId"],
    id: value["id"],
    subscription_external_id: value["subscriptionExternalId"],
    subtotal: value["subtotal"],
    updated_at: value["updatedAt"].toISOString(),
  };
}
