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
import type { ListInvoicesParams } from "./ListInvoicesParams";
import {
  ListInvoicesParamsFromJSON,
  ListInvoicesParamsFromJSONTyped,
  ListInvoicesParamsToJSON,
} from "./ListInvoicesParams";
import type { InvoiceResponseData } from "./InvoiceResponseData";
import {
  InvoiceResponseDataFromJSON,
  InvoiceResponseDataFromJSONTyped,
  InvoiceResponseDataToJSON,
} from "./InvoiceResponseData";

/**
 *
 * @export
 * @interface ListInvoicesResponse
 */
export interface ListInvoicesResponse {
  /**
   * The returned resources
   * @type {Array<InvoiceResponseData>}
   * @memberof ListInvoicesResponse
   */
  data: Array<InvoiceResponseData>;
  /**
   *
   * @type {ListInvoicesParams}
   * @memberof ListInvoicesResponse
   */
  params: ListInvoicesParams;
}

/**
 * Check if a given object implements the ListInvoicesResponse interface.
 */
export function instanceOfListInvoicesResponse(
  value: object,
): value is ListInvoicesResponse {
  if (!("data" in value) || value["data"] === undefined) return false;
  if (!("params" in value) || value["params"] === undefined) return false;
  return true;
}

export function ListInvoicesResponseFromJSON(json: any): ListInvoicesResponse {
  return ListInvoicesResponseFromJSONTyped(json, false);
}

export function ListInvoicesResponseFromJSONTyped(
  json: any,
  ignoreDiscriminator: boolean,
): ListInvoicesResponse {
  if (json == null) {
    return json;
  }
  return {
    data: (json["data"] as Array<any>).map(InvoiceResponseDataFromJSON),
    params: ListInvoicesParamsFromJSON(json["params"]),
  };
}

export function ListInvoicesResponseToJSON(
  value?: ListInvoicesResponse | null,
): any {
  if (value == null) {
    return value;
  }
  return {
    data: (value["data"] as Array<any>).map(InvoiceResponseDataToJSON),
    params: ListInvoicesParamsToJSON(value["params"]),
  };
}
