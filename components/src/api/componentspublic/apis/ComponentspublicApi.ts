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

import * as runtime from "../runtime";
import type { ApiError, GetPublicPlansResponse } from "../models/index";
import {
  ApiErrorFromJSON,
  ApiErrorToJSON,
  GetPublicPlansResponseFromJSON,
  GetPublicPlansResponseToJSON,
} from "../models/index";

/**
 *
 */
export class ComponentspublicApi extends runtime.BaseAPI {
  /**
   * Get public plans
   */
  async getPublicPlansRaw(
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetPublicPlansResponse>> {
    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/public/plans`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      GetPublicPlansResponseFromJSON(jsonValue),
    );
  }

  /**
   * Get public plans
   */
  async getPublicPlans(
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetPublicPlansResponse> {
    const response = await this.getPublicPlansRaw(initOverrides);
    return await response.value();
  }
}
