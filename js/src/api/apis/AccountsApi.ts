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
  CountApiKeysResponse,
  CountApiRequestsResponse,
  CreateApiKeyRequestBody,
  CreateApiKeyResponse,
  CreateEnvironmentRequestBody,
  CreateEnvironmentResponse,
  DeleteApiKeyResponse,
  DeleteEnvironmentResponse,
  GetApiKeyResponse,
  GetApiRequestResponse,
  GetEnvironmentResponse,
  ListApiKeysResponse,
  ListApiRequestsResponse,
  ListEnvironmentsResponse,
  UpdateApiKeyRequestBody,
  UpdateApiKeyResponse,
  UpdateEnvironmentRequestBody,
  UpdateEnvironmentResponse,
} from "../models/index";
import {
  ApiErrorFromJSON,
  ApiErrorToJSON,
  CountApiKeysResponseFromJSON,
  CountApiKeysResponseToJSON,
  CountApiRequestsResponseFromJSON,
  CountApiRequestsResponseToJSON,
  CreateApiKeyRequestBodyFromJSON,
  CreateApiKeyRequestBodyToJSON,
  CreateApiKeyResponseFromJSON,
  CreateApiKeyResponseToJSON,
  CreateEnvironmentRequestBodyFromJSON,
  CreateEnvironmentRequestBodyToJSON,
  CreateEnvironmentResponseFromJSON,
  CreateEnvironmentResponseToJSON,
  DeleteApiKeyResponseFromJSON,
  DeleteApiKeyResponseToJSON,
  DeleteEnvironmentResponseFromJSON,
  DeleteEnvironmentResponseToJSON,
  GetApiKeyResponseFromJSON,
  GetApiKeyResponseToJSON,
  GetApiRequestResponseFromJSON,
  GetApiRequestResponseToJSON,
  GetEnvironmentResponseFromJSON,
  GetEnvironmentResponseToJSON,
  ListApiKeysResponseFromJSON,
  ListApiKeysResponseToJSON,
  ListApiRequestsResponseFromJSON,
  ListApiRequestsResponseToJSON,
  ListEnvironmentsResponseFromJSON,
  ListEnvironmentsResponseToJSON,
  UpdateApiKeyRequestBodyFromJSON,
  UpdateApiKeyRequestBodyToJSON,
  UpdateApiKeyResponseFromJSON,
  UpdateApiKeyResponseToJSON,
  UpdateEnvironmentRequestBodyFromJSON,
  UpdateEnvironmentRequestBodyToJSON,
  UpdateEnvironmentResponseFromJSON,
  UpdateEnvironmentResponseToJSON,
} from "../models/index";

export interface CountApiKeysRequest {
  requireEnvironment: boolean;
  environmentId?: string;
  limit?: number;
  offset?: number;
}

export interface CountApiRequestsRequest {
  q?: string;
  requestType?: string;
  environmentId?: string;
  limit?: number;
  offset?: number;
}

export interface CreateApiKeyRequest {
  createApiKeyRequestBody: CreateApiKeyRequestBody;
}

export interface CreateEnvironmentRequest {
  createEnvironmentRequestBody: CreateEnvironmentRequestBody;
}

export interface DeleteApiKeyRequest {
  apiKeyId: string;
}

export interface DeleteEnvironmentRequest {
  environmentId: string;
}

export interface GetApiKeyRequest {
  apiKeyId: string;
}

export interface GetApiRequestRequest {
  apiRequestId: string;
}

export interface GetEnvironmentRequest {
  environmentId: string;
}

export interface ListApiKeysRequest {
  requireEnvironment: boolean;
  environmentId?: string;
  limit?: number;
  offset?: number;
}

export interface ListApiRequestsRequest {
  q?: string;
  requestType?: string;
  environmentId?: string;
  limit?: number;
  offset?: number;
}

export interface ListEnvironmentsRequest {
  ids?: Array<string>;
  limit?: number;
  offset?: number;
}

export interface UpdateApiKeyRequest {
  apiKeyId: string;
  updateApiKeyRequestBody: UpdateApiKeyRequestBody;
}

export interface UpdateEnvironmentRequest {
  environmentId: string;
  updateEnvironmentRequestBody: UpdateEnvironmentRequestBody;
}

/**
 *
 */
export class AccountsApi extends runtime.BaseAPI {
  /**
   * Count api keys
   */
  async countApiKeysRaw(
    requestParameters: CountApiKeysRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CountApiKeysResponse>> {
    if (requestParameters["requireEnvironment"] == null) {
      throw new runtime.RequiredError(
        "requireEnvironment",
        'Required parameter "requireEnvironment" was null or undefined when calling countApiKeys().',
      );
    }

    const queryParameters: any = {};

    if (requestParameters["environmentId"] != null) {
      queryParameters["environment_id"] = requestParameters["environmentId"];
    }

    if (requestParameters["requireEnvironment"] != null) {
      queryParameters["require_environment"] =
        requestParameters["requireEnvironment"];
    }

    if (requestParameters["limit"] != null) {
      queryParameters["limit"] = requestParameters["limit"];
    }

    if (requestParameters["offset"] != null) {
      queryParameters["offset"] = requestParameters["offset"];
    }

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/api-keys/count`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CountApiKeysResponseFromJSON(jsonValue),
    );
  }

  /**
   * Count api keys
   */
  async countApiKeys(
    requestParameters: CountApiKeysRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CountApiKeysResponse> {
    const response = await this.countApiKeysRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Count api requests
   */
  async countApiRequestsRaw(
    requestParameters: CountApiRequestsRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CountApiRequestsResponse>> {
    const queryParameters: any = {};

    if (requestParameters["q"] != null) {
      queryParameters["q"] = requestParameters["q"];
    }

    if (requestParameters["requestType"] != null) {
      queryParameters["request_type"] = requestParameters["requestType"];
    }

    if (requestParameters["environmentId"] != null) {
      queryParameters["environment_id"] = requestParameters["environmentId"];
    }

    if (requestParameters["limit"] != null) {
      queryParameters["limit"] = requestParameters["limit"];
    }

    if (requestParameters["offset"] != null) {
      queryParameters["offset"] = requestParameters["offset"];
    }

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/api-requests/count`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CountApiRequestsResponseFromJSON(jsonValue),
    );
  }

  /**
   * Count api requests
   */
  async countApiRequests(
    requestParameters: CountApiRequestsRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CountApiRequestsResponse> {
    const response = await this.countApiRequestsRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Create api key
   */
  async createApiKeyRaw(
    requestParameters: CreateApiKeyRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CreateApiKeyResponse>> {
    if (requestParameters["createApiKeyRequestBody"] == null) {
      throw new runtime.RequiredError(
        "createApiKeyRequestBody",
        'Required parameter "createApiKeyRequestBody" was null or undefined when calling createApiKey().',
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
        path: `/api-keys`,
        method: "POST",
        headers: headerParameters,
        query: queryParameters,
        body: CreateApiKeyRequestBodyToJSON(
          requestParameters["createApiKeyRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CreateApiKeyResponseFromJSON(jsonValue),
    );
  }

  /**
   * Create api key
   */
  async createApiKey(
    requestParameters: CreateApiKeyRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CreateApiKeyResponse> {
    const response = await this.createApiKeyRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Create environment
   */
  async createEnvironmentRaw(
    requestParameters: CreateEnvironmentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CreateEnvironmentResponse>> {
    if (requestParameters["createEnvironmentRequestBody"] == null) {
      throw new runtime.RequiredError(
        "createEnvironmentRequestBody",
        'Required parameter "createEnvironmentRequestBody" was null or undefined when calling createEnvironment().',
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
        path: `/environments`,
        method: "POST",
        headers: headerParameters,
        query: queryParameters,
        body: CreateEnvironmentRequestBodyToJSON(
          requestParameters["createEnvironmentRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CreateEnvironmentResponseFromJSON(jsonValue),
    );
  }

  /**
   * Create environment
   */
  async createEnvironment(
    requestParameters: CreateEnvironmentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CreateEnvironmentResponse> {
    const response = await this.createEnvironmentRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Delete api key
   */
  async deleteApiKeyRaw(
    requestParameters: DeleteApiKeyRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<DeleteApiKeyResponse>> {
    if (requestParameters["apiKeyId"] == null) {
      throw new runtime.RequiredError(
        "apiKeyId",
        'Required parameter "apiKeyId" was null or undefined when calling deleteApiKey().',
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
        path: `/api-keys/{api_key_id}`.replace(
          `{${"api_key_id"}}`,
          encodeURIComponent(String(requestParameters["apiKeyId"])),
        ),
        method: "DELETE",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      DeleteApiKeyResponseFromJSON(jsonValue),
    );
  }

  /**
   * Delete api key
   */
  async deleteApiKey(
    requestParameters: DeleteApiKeyRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<DeleteApiKeyResponse> {
    const response = await this.deleteApiKeyRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Delete environment
   */
  async deleteEnvironmentRaw(
    requestParameters: DeleteEnvironmentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<DeleteEnvironmentResponse>> {
    if (requestParameters["environmentId"] == null) {
      throw new runtime.RequiredError(
        "environmentId",
        'Required parameter "environmentId" was null or undefined when calling deleteEnvironment().',
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
        path: `/environments/{environment_id}`.replace(
          `{${"environment_id"}}`,
          encodeURIComponent(String(requestParameters["environmentId"])),
        ),
        method: "DELETE",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      DeleteEnvironmentResponseFromJSON(jsonValue),
    );
  }

  /**
   * Delete environment
   */
  async deleteEnvironment(
    requestParameters: DeleteEnvironmentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<DeleteEnvironmentResponse> {
    const response = await this.deleteEnvironmentRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Get api key
   */
  async getApiKeyRaw(
    requestParameters: GetApiKeyRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetApiKeyResponse>> {
    if (requestParameters["apiKeyId"] == null) {
      throw new runtime.RequiredError(
        "apiKeyId",
        'Required parameter "apiKeyId" was null or undefined when calling getApiKey().',
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
        path: `/api-keys/{api_key_id}`.replace(
          `{${"api_key_id"}}`,
          encodeURIComponent(String(requestParameters["apiKeyId"])),
        ),
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      GetApiKeyResponseFromJSON(jsonValue),
    );
  }

  /**
   * Get api key
   */
  async getApiKey(
    requestParameters: GetApiKeyRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetApiKeyResponse> {
    const response = await this.getApiKeyRaw(requestParameters, initOverrides);
    return await response.value();
  }

  /**
   * Get api request
   */
  async getApiRequestRaw(
    requestParameters: GetApiRequestRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetApiRequestResponse>> {
    if (requestParameters["apiRequestId"] == null) {
      throw new runtime.RequiredError(
        "apiRequestId",
        'Required parameter "apiRequestId" was null or undefined when calling getApiRequest().',
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
        path: `/api-requests/{api_request_id}`.replace(
          `{${"api_request_id"}}`,
          encodeURIComponent(String(requestParameters["apiRequestId"])),
        ),
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      GetApiRequestResponseFromJSON(jsonValue),
    );
  }

  /**
   * Get api request
   */
  async getApiRequest(
    requestParameters: GetApiRequestRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetApiRequestResponse> {
    const response = await this.getApiRequestRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Get environment
   */
  async getEnvironmentRaw(
    requestParameters: GetEnvironmentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetEnvironmentResponse>> {
    if (requestParameters["environmentId"] == null) {
      throw new runtime.RequiredError(
        "environmentId",
        'Required parameter "environmentId" was null or undefined when calling getEnvironment().',
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
        path: `/environments/{environment_id}`.replace(
          `{${"environment_id"}}`,
          encodeURIComponent(String(requestParameters["environmentId"])),
        ),
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      GetEnvironmentResponseFromJSON(jsonValue),
    );
  }

  /**
   * Get environment
   */
  async getEnvironment(
    requestParameters: GetEnvironmentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetEnvironmentResponse> {
    const response = await this.getEnvironmentRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * List api keys
   */
  async listApiKeysRaw(
    requestParameters: ListApiKeysRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<ListApiKeysResponse>> {
    if (requestParameters["requireEnvironment"] == null) {
      throw new runtime.RequiredError(
        "requireEnvironment",
        'Required parameter "requireEnvironment" was null or undefined when calling listApiKeys().',
      );
    }

    const queryParameters: any = {};

    if (requestParameters["environmentId"] != null) {
      queryParameters["environment_id"] = requestParameters["environmentId"];
    }

    if (requestParameters["requireEnvironment"] != null) {
      queryParameters["require_environment"] =
        requestParameters["requireEnvironment"];
    }

    if (requestParameters["limit"] != null) {
      queryParameters["limit"] = requestParameters["limit"];
    }

    if (requestParameters["offset"] != null) {
      queryParameters["offset"] = requestParameters["offset"];
    }

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/api-keys`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      ListApiKeysResponseFromJSON(jsonValue),
    );
  }

  /**
   * List api keys
   */
  async listApiKeys(
    requestParameters: ListApiKeysRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<ListApiKeysResponse> {
    const response = await this.listApiKeysRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * List api requests
   */
  async listApiRequestsRaw(
    requestParameters: ListApiRequestsRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<ListApiRequestsResponse>> {
    const queryParameters: any = {};

    if (requestParameters["q"] != null) {
      queryParameters["q"] = requestParameters["q"];
    }

    if (requestParameters["requestType"] != null) {
      queryParameters["request_type"] = requestParameters["requestType"];
    }

    if (requestParameters["environmentId"] != null) {
      queryParameters["environment_id"] = requestParameters["environmentId"];
    }

    if (requestParameters["limit"] != null) {
      queryParameters["limit"] = requestParameters["limit"];
    }

    if (requestParameters["offset"] != null) {
      queryParameters["offset"] = requestParameters["offset"];
    }

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/api-requests`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      ListApiRequestsResponseFromJSON(jsonValue),
    );
  }

  /**
   * List api requests
   */
  async listApiRequests(
    requestParameters: ListApiRequestsRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<ListApiRequestsResponse> {
    const response = await this.listApiRequestsRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * List environments
   */
  async listEnvironmentsRaw(
    requestParameters: ListEnvironmentsRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<ListEnvironmentsResponse>> {
    const queryParameters: any = {};

    if (requestParameters["ids"] != null) {
      queryParameters["ids"] = requestParameters["ids"];
    }

    if (requestParameters["limit"] != null) {
      queryParameters["limit"] = requestParameters["limit"];
    }

    if (requestParameters["offset"] != null) {
      queryParameters["offset"] = requestParameters["offset"];
    }

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/environments`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      ListEnvironmentsResponseFromJSON(jsonValue),
    );
  }

  /**
   * List environments
   */
  async listEnvironments(
    requestParameters: ListEnvironmentsRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<ListEnvironmentsResponse> {
    const response = await this.listEnvironmentsRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Update api key
   */
  async updateApiKeyRaw(
    requestParameters: UpdateApiKeyRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<UpdateApiKeyResponse>> {
    if (requestParameters["apiKeyId"] == null) {
      throw new runtime.RequiredError(
        "apiKeyId",
        'Required parameter "apiKeyId" was null or undefined when calling updateApiKey().',
      );
    }

    if (requestParameters["updateApiKeyRequestBody"] == null) {
      throw new runtime.RequiredError(
        "updateApiKeyRequestBody",
        'Required parameter "updateApiKeyRequestBody" was null or undefined when calling updateApiKey().',
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
        path: `/api-keys/{api_key_id}`.replace(
          `{${"api_key_id"}}`,
          encodeURIComponent(String(requestParameters["apiKeyId"])),
        ),
        method: "PUT",
        headers: headerParameters,
        query: queryParameters,
        body: UpdateApiKeyRequestBodyToJSON(
          requestParameters["updateApiKeyRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      UpdateApiKeyResponseFromJSON(jsonValue),
    );
  }

  /**
   * Update api key
   */
  async updateApiKey(
    requestParameters: UpdateApiKeyRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<UpdateApiKeyResponse> {
    const response = await this.updateApiKeyRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Update environment
   */
  async updateEnvironmentRaw(
    requestParameters: UpdateEnvironmentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<UpdateEnvironmentResponse>> {
    if (requestParameters["environmentId"] == null) {
      throw new runtime.RequiredError(
        "environmentId",
        'Required parameter "environmentId" was null or undefined when calling updateEnvironment().',
      );
    }

    if (requestParameters["updateEnvironmentRequestBody"] == null) {
      throw new runtime.RequiredError(
        "updateEnvironmentRequestBody",
        'Required parameter "updateEnvironmentRequestBody" was null or undefined when calling updateEnvironment().',
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
        path: `/environments/{environment_id}`.replace(
          `{${"environment_id"}}`,
          encodeURIComponent(String(requestParameters["environmentId"])),
        ),
        method: "PUT",
        headers: headerParameters,
        query: queryParameters,
        body: UpdateEnvironmentRequestBodyToJSON(
          requestParameters["updateEnvironmentRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      UpdateEnvironmentResponseFromJSON(jsonValue),
    );
  }

  /**
   * Update environment
   */
  async updateEnvironment(
    requestParameters: UpdateEnvironmentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<UpdateEnvironmentResponse> {
    const response = await this.updateEnvironmentRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }
}
