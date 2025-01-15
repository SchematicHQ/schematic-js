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
import type {
  ApiError,
  CreatePlanGroupRequestBody,
  CreatePlanGroupResponse,
  GetPlanGroupResponse,
  UpdatePlanGroupRequestBody,
  UpdatePlanGroupResponse,
} from "../models/index";
import {
  ApiErrorFromJSON,
  ApiErrorToJSON,
  CreatePlanGroupRequestBodyFromJSON,
  CreatePlanGroupRequestBodyToJSON,
  CreatePlanGroupResponseFromJSON,
  CreatePlanGroupResponseToJSON,
  GetPlanGroupResponseFromJSON,
  GetPlanGroupResponseToJSON,
  UpdatePlanGroupRequestBodyFromJSON,
  UpdatePlanGroupRequestBodyToJSON,
  UpdatePlanGroupResponseFromJSON,
  UpdatePlanGroupResponseToJSON,
} from "../models/index";

export interface CreatePlanGroupRequest {
  createPlanGroupRequestBody: CreatePlanGroupRequestBody;
}

export interface UpdatePlanGroupRequest {
  planGroupId: string;
  updatePlanGroupRequestBody: UpdatePlanGroupRequestBody;
}

/**
 *
 */
export class PlangroupsApi extends runtime.BaseAPI {
  /**
   * Create plan group
   */
  async createPlanGroupRaw(
    requestParameters: CreatePlanGroupRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CreatePlanGroupResponse>> {
    if (requestParameters["createPlanGroupRequestBody"] == null) {
      throw new runtime.RequiredError(
        "createPlanGroupRequestBody",
        'Required parameter "createPlanGroupRequestBody" was null or undefined when calling createPlanGroup().',
      );
    }

    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    headerParameters["Content-Type"] = "application/json";

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/plan-groups`,
        method: "POST",
        headers: headerParameters,
        query: queryParameters,
        body: CreatePlanGroupRequestBodyToJSON(
          requestParameters["createPlanGroupRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CreatePlanGroupResponseFromJSON(jsonValue),
    );
  }

  /**
   * Create plan group
   */
  async createPlanGroup(
    requestParameters: CreatePlanGroupRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CreatePlanGroupResponse> {
    const response = await this.createPlanGroupRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Get plan group
   */
  async getPlanGroupRaw(
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetPlanGroupResponse>> {
    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/plan-groups`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      GetPlanGroupResponseFromJSON(jsonValue),
    );
  }

  /**
   * Get plan group
   */
  async getPlanGroup(
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetPlanGroupResponse> {
    const response = await this.getPlanGroupRaw(initOverrides);
    return await response.value();
  }

  /**
   * Update plan group
   */
  async updatePlanGroupRaw(
    requestParameters: UpdatePlanGroupRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<UpdatePlanGroupResponse>> {
    if (requestParameters["planGroupId"] == null) {
      throw new runtime.RequiredError(
        "planGroupId",
        'Required parameter "planGroupId" was null or undefined when calling updatePlanGroup().',
      );
    }

    if (requestParameters["updatePlanGroupRequestBody"] == null) {
      throw new runtime.RequiredError(
        "updatePlanGroupRequestBody",
        'Required parameter "updatePlanGroupRequestBody" was null or undefined when calling updatePlanGroup().',
      );
    }

    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    headerParameters["Content-Type"] = "application/json";

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/plan-groups/{plan_group_id}`.replace(
          `{${"plan_group_id"}}`,
          encodeURIComponent(String(requestParameters["planGroupId"])),
        ),
        method: "PUT",
        headers: headerParameters,
        query: queryParameters,
        body: UpdatePlanGroupRequestBodyToJSON(
          requestParameters["updatePlanGroupRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      UpdatePlanGroupResponseFromJSON(jsonValue),
    );
  }

  /**
   * Update plan group
   */
  async updatePlanGroup(
    requestParameters: UpdatePlanGroupRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<UpdatePlanGroupResponse> {
    const response = await this.updatePlanGroupRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }
}
