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
import type { ListActivePlansResponse } from "../models/index";
import { ListActivePlansResponseFromJSON } from "../models/index";

/**
 *
 */
export class PlansApi extends runtime.BaseAPI {
  /**
   * List active plans
   */
  async listActivePlansRaw(
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<ListActivePlansResponse>> {
    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/plans/active`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      ListActivePlansResponseFromJSON(jsonValue),
    );
  }

  /**
   * List active plans
   */
  async listActivePlans(
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<ListActivePlansResponse> {
    const response = await this.listActivePlansRaw(initOverrides);
    return await response.value();
  }
}
