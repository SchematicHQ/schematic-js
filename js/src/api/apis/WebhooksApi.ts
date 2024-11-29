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
  CountWebhookEventsResponse,
  CountWebhooksResponse,
  CreateWebhookRequestBody,
  CreateWebhookResponse,
  DeleteWebhookResponse,
  GetWebhookEventResponse,
  GetWebhookResponse,
  ListWebhookEventsResponse,
  ListWebhooksResponse,
  UpdateWebhookRequestBody,
  UpdateWebhookResponse,
} from "../models/index";
import {
  ApiErrorFromJSON,
  ApiErrorToJSON,
  CountWebhookEventsResponseFromJSON,
  CountWebhookEventsResponseToJSON,
  CountWebhooksResponseFromJSON,
  CountWebhooksResponseToJSON,
  CreateWebhookRequestBodyFromJSON,
  CreateWebhookRequestBodyToJSON,
  CreateWebhookResponseFromJSON,
  CreateWebhookResponseToJSON,
  DeleteWebhookResponseFromJSON,
  DeleteWebhookResponseToJSON,
  GetWebhookEventResponseFromJSON,
  GetWebhookEventResponseToJSON,
  GetWebhookResponseFromJSON,
  GetWebhookResponseToJSON,
  ListWebhookEventsResponseFromJSON,
  ListWebhookEventsResponseToJSON,
  ListWebhooksResponseFromJSON,
  ListWebhooksResponseToJSON,
  UpdateWebhookRequestBodyFromJSON,
  UpdateWebhookRequestBodyToJSON,
  UpdateWebhookResponseFromJSON,
  UpdateWebhookResponseToJSON,
} from "../models/index";

export interface CountWebhookEventsRequest {
  ids?: Array<string>;
  q?: string;
  webhookId?: string;
  limit?: number;
  offset?: number;
}

export interface CountWebhooksRequest {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface CreateWebhookRequest {
  createWebhookRequestBody: CreateWebhookRequestBody;
}

export interface DeleteWebhookRequest {
  webhookId: string;
}

export interface GetWebhookRequest {
  webhookId: string;
}

export interface GetWebhookEventRequest {
  webhookEventId: string;
}

export interface ListWebhookEventsRequest {
  ids?: Array<string>;
  q?: string;
  webhookId?: string;
  limit?: number;
  offset?: number;
}

export interface ListWebhooksRequest {
  q?: string;
  limit?: number;
  offset?: number;
}

export interface UpdateWebhookRequest {
  webhookId: string;
  updateWebhookRequestBody: UpdateWebhookRequestBody;
}

/**
 *
 */
export class WebhooksApi extends runtime.BaseAPI {
  /**
   * Count webhook events
   */
  async countWebhookEventsRaw(
    requestParameters: CountWebhookEventsRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CountWebhookEventsResponse>> {
    const queryParameters: any = {};

    if (requestParameters["ids"] != null) {
      queryParameters["ids"] = requestParameters["ids"];
    }

    if (requestParameters["q"] != null) {
      queryParameters["q"] = requestParameters["q"];
    }

    if (requestParameters["webhookId"] != null) {
      queryParameters["webhook_id"] = requestParameters["webhookId"];
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
        path: `/webhook-events/count`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CountWebhookEventsResponseFromJSON(jsonValue),
    );
  }

  /**
   * Count webhook events
   */
  async countWebhookEvents(
    requestParameters: CountWebhookEventsRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CountWebhookEventsResponse> {
    const response = await this.countWebhookEventsRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Count webhooks
   */
  async countWebhooksRaw(
    requestParameters: CountWebhooksRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CountWebhooksResponse>> {
    const queryParameters: any = {};

    if (requestParameters["q"] != null) {
      queryParameters["q"] = requestParameters["q"];
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
        path: `/webhooks/count`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CountWebhooksResponseFromJSON(jsonValue),
    );
  }

  /**
   * Count webhooks
   */
  async countWebhooks(
    requestParameters: CountWebhooksRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CountWebhooksResponse> {
    const response = await this.countWebhooksRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Create webhook
   */
  async createWebhookRaw(
    requestParameters: CreateWebhookRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CreateWebhookResponse>> {
    if (requestParameters["createWebhookRequestBody"] == null) {
      throw new runtime.RequiredError(
        "createWebhookRequestBody",
        'Required parameter "createWebhookRequestBody" was null or undefined when calling createWebhook().',
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
        path: `/webhooks`,
        method: "POST",
        headers: headerParameters,
        query: queryParameters,
        body: CreateWebhookRequestBodyToJSON(
          requestParameters["createWebhookRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CreateWebhookResponseFromJSON(jsonValue),
    );
  }

  /**
   * Create webhook
   */
  async createWebhook(
    requestParameters: CreateWebhookRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CreateWebhookResponse> {
    const response = await this.createWebhookRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Delete webhook
   */
  async deleteWebhookRaw(
    requestParameters: DeleteWebhookRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<DeleteWebhookResponse>> {
    if (requestParameters["webhookId"] == null) {
      throw new runtime.RequiredError(
        "webhookId",
        'Required parameter "webhookId" was null or undefined when calling deleteWebhook().',
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
        path: `/webhooks/{webhook_id}`.replace(
          `{${"webhook_id"}}`,
          encodeURIComponent(String(requestParameters["webhookId"])),
        ),
        method: "DELETE",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      DeleteWebhookResponseFromJSON(jsonValue),
    );
  }

  /**
   * Delete webhook
   */
  async deleteWebhook(
    requestParameters: DeleteWebhookRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<DeleteWebhookResponse> {
    const response = await this.deleteWebhookRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Get webhook
   */
  async getWebhookRaw(
    requestParameters: GetWebhookRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetWebhookResponse>> {
    if (requestParameters["webhookId"] == null) {
      throw new runtime.RequiredError(
        "webhookId",
        'Required parameter "webhookId" was null or undefined when calling getWebhook().',
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
        path: `/webhooks/{webhook_id}`.replace(
          `{${"webhook_id"}}`,
          encodeURIComponent(String(requestParameters["webhookId"])),
        ),
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      GetWebhookResponseFromJSON(jsonValue),
    );
  }

  /**
   * Get webhook
   */
  async getWebhook(
    requestParameters: GetWebhookRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetWebhookResponse> {
    const response = await this.getWebhookRaw(requestParameters, initOverrides);
    return await response.value();
  }

  /**
   * Get webhook event
   */
  async getWebhookEventRaw(
    requestParameters: GetWebhookEventRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetWebhookEventResponse>> {
    if (requestParameters["webhookEventId"] == null) {
      throw new runtime.RequiredError(
        "webhookEventId",
        'Required parameter "webhookEventId" was null or undefined when calling getWebhookEvent().',
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
        path: `/webhook-events/{webhook_event_id}`.replace(
          `{${"webhook_event_id"}}`,
          encodeURIComponent(String(requestParameters["webhookEventId"])),
        ),
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      GetWebhookEventResponseFromJSON(jsonValue),
    );
  }

  /**
   * Get webhook event
   */
  async getWebhookEvent(
    requestParameters: GetWebhookEventRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetWebhookEventResponse> {
    const response = await this.getWebhookEventRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * List webhook events
   */
  async listWebhookEventsRaw(
    requestParameters: ListWebhookEventsRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<ListWebhookEventsResponse>> {
    const queryParameters: any = {};

    if (requestParameters["ids"] != null) {
      queryParameters["ids"] = requestParameters["ids"];
    }

    if (requestParameters["q"] != null) {
      queryParameters["q"] = requestParameters["q"];
    }

    if (requestParameters["webhookId"] != null) {
      queryParameters["webhook_id"] = requestParameters["webhookId"];
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
        path: `/webhook-events`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      ListWebhookEventsResponseFromJSON(jsonValue),
    );
  }

  /**
   * List webhook events
   */
  async listWebhookEvents(
    requestParameters: ListWebhookEventsRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<ListWebhookEventsResponse> {
    const response = await this.listWebhookEventsRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * List webhooks
   */
  async listWebhooksRaw(
    requestParameters: ListWebhooksRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<ListWebhooksResponse>> {
    const queryParameters: any = {};

    if (requestParameters["q"] != null) {
      queryParameters["q"] = requestParameters["q"];
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
        path: `/webhooks`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      ListWebhooksResponseFromJSON(jsonValue),
    );
  }

  /**
   * List webhooks
   */
  async listWebhooks(
    requestParameters: ListWebhooksRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<ListWebhooksResponse> {
    const response = await this.listWebhooksRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Update webhook
   */
  async updateWebhookRaw(
    requestParameters: UpdateWebhookRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<UpdateWebhookResponse>> {
    if (requestParameters["webhookId"] == null) {
      throw new runtime.RequiredError(
        "webhookId",
        'Required parameter "webhookId" was null or undefined when calling updateWebhook().',
      );
    }

    if (requestParameters["updateWebhookRequestBody"] == null) {
      throw new runtime.RequiredError(
        "updateWebhookRequestBody",
        'Required parameter "updateWebhookRequestBody" was null or undefined when calling updateWebhook().',
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
        path: `/webhooks/{webhook_id}`.replace(
          `{${"webhook_id"}}`,
          encodeURIComponent(String(requestParameters["webhookId"])),
        ),
        method: "PUT",
        headers: headerParameters,
        query: queryParameters,
        body: UpdateWebhookRequestBodyToJSON(
          requestParameters["updateWebhookRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      UpdateWebhookResponseFromJSON(jsonValue),
    );
  }

  /**
   * Update webhook
   */
  async updateWebhook(
    requestParameters: UpdateWebhookRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<UpdateWebhookResponse> {
    const response = await this.updateWebhookRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }
}
