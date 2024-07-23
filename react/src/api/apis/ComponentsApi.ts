/* tslint:disable */
/* eslint-disable */

import * as runtime from "../runtime";
import type { HydrateComponentResponse } from "../models/index";
import { HydrateComponentResponseFromJSON } from "../models/index";

export interface CountComponentsRequest {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface HydrateComponentRequest {
  componentId: string;
}

/**
 *
 */
export class ComponentsApi extends runtime.BaseAPI {
  /**
   * Hydrate component
   */
  async hydrateComponentRaw(
    requestParameters: HydrateComponentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<HydrateComponentResponse>> {
    if (requestParameters["componentId"] == null) {
      throw new runtime.RequiredError(
        "componentId",
        'Required parameter "componentId" was null or undefined when calling hydrateComponent().',
      );
    }

    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/components/{component_id}/hydrate`.replace(
          `{${"component_id"}}`,
          encodeURIComponent(String(requestParameters["componentId"])),
        ),
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      HydrateComponentResponseFromJSON(jsonValue),
    );
  }

  /**
   * Hydrate component
   */
  async hydrateComponent(
    requestParameters: HydrateComponentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<HydrateComponentResponse> {
    const response = await this.hydrateComponentRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }
}
