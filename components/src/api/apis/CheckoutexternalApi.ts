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
  ChangeSubscriptionRequestBody,
  CheckoutResponse,
  CheckoutUnsubscribeResponse,
  GetSetupIntentResponse,
  HydrateComponentResponse,
  ListInvoicesResponse,
  PreviewCheckoutResponse,
  UpdatePaymentMethodRequestBody,
  UpdatePaymentMethodResponse,
} from "../models/index";
import {
  ApiErrorFromJSON,
  ApiErrorToJSON,
  ChangeSubscriptionRequestBodyFromJSON,
  ChangeSubscriptionRequestBodyToJSON,
  CheckoutResponseFromJSON,
  CheckoutResponseToJSON,
  CheckoutUnsubscribeResponseFromJSON,
  CheckoutUnsubscribeResponseToJSON,
  GetSetupIntentResponseFromJSON,
  GetSetupIntentResponseToJSON,
  HydrateComponentResponseFromJSON,
  HydrateComponentResponseToJSON,
  ListInvoicesResponseFromJSON,
  ListInvoicesResponseToJSON,
  PreviewCheckoutResponseFromJSON,
  PreviewCheckoutResponseToJSON,
  UpdatePaymentMethodRequestBodyFromJSON,
  UpdatePaymentMethodRequestBodyToJSON,
  UpdatePaymentMethodResponseFromJSON,
  UpdatePaymentMethodResponseToJSON,
} from "../models/index";

export interface CheckoutRequest {
  changeSubscriptionRequestBody: ChangeSubscriptionRequestBody;
}

export interface GetSetupIntentRequest {
  componentId: string;
}

export interface HydrateComponentRequest {
  componentId: string;
}

export interface ListInvoicesRequest {
  limit?: number;
  offset?: number;
}

export interface PreviewCheckoutRequest {
  changeSubscriptionRequestBody: ChangeSubscriptionRequestBody;
}

export interface UpdatePaymentMethodRequest {
  updatePaymentMethodRequestBody: UpdatePaymentMethodRequestBody;
}

/**
 *
 */
export class CheckoutexternalApi extends runtime.BaseAPI {
  /**
   * Checkout
   */
  async checkoutRaw(
    requestParameters: CheckoutRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CheckoutResponse>> {
    if (requestParameters["changeSubscriptionRequestBody"] == null) {
      throw new runtime.RequiredError(
        "changeSubscriptionRequestBody",
        'Required parameter "changeSubscriptionRequestBody" was null or undefined when calling checkout().',
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
        path: `/checkout`,
        method: "POST",
        headers: headerParameters,
        query: queryParameters,
        body: ChangeSubscriptionRequestBodyToJSON(
          requestParameters["changeSubscriptionRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CheckoutResponseFromJSON(jsonValue),
    );
  }

  /**
   * Checkout
   */
  async checkout(
    requestParameters: CheckoutRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CheckoutResponse> {
    const response = await this.checkoutRaw(requestParameters, initOverrides);
    return await response.value();
  }

  /**
   * Checkout unsubscribe
   */
  async checkoutUnsubscribeRaw(
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<CheckoutUnsubscribeResponse>> {
    const queryParameters: any = {};

    const headerParameters: runtime.HTTPHeaders = {};

    if (this.configuration && this.configuration.apiKey) {
      headerParameters["X-Schematic-Api-Key"] = await this.configuration.apiKey(
        "X-Schematic-Api-Key",
      ); // ApiKeyAuth authentication
    }

    const response = await this.request(
      {
        path: `/checkout/unsubscribe`,
        method: "DELETE",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      CheckoutUnsubscribeResponseFromJSON(jsonValue),
    );
  }

  /**
   * Checkout unsubscribe
   */
  async checkoutUnsubscribe(
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<CheckoutUnsubscribeResponse> {
    const response = await this.checkoutUnsubscribeRaw(initOverrides);
    return await response.value();
  }

  /**
   * Get setup intent
   */
  async getSetupIntentRaw(
    requestParameters: GetSetupIntentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<GetSetupIntentResponse>> {
    if (requestParameters["componentId"] == null) {
      throw new runtime.RequiredError(
        "componentId",
        'Required parameter "componentId" was null or undefined when calling getSetupIntent().',
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
        path: `/components/{component_id}/setup-intent`.replace(
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
      GetSetupIntentResponseFromJSON(jsonValue),
    );
  }

  /**
   * Get setup intent
   */
  async getSetupIntent(
    requestParameters: GetSetupIntentRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<GetSetupIntentResponse> {
    const response = await this.getSetupIntentRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

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

  /**
   * List invoices
   */
  async listInvoicesRaw(
    requestParameters: ListInvoicesRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<ListInvoicesResponse>> {
    const queryParameters: any = {};

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
        path: `/components/invoices`,
        method: "GET",
        headers: headerParameters,
        query: queryParameters,
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      ListInvoicesResponseFromJSON(jsonValue),
    );
  }

  /**
   * List invoices
   */
  async listInvoices(
    requestParameters: ListInvoicesRequest = {},
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<ListInvoicesResponse> {
    const response = await this.listInvoicesRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Preview checkout
   */
  async previewCheckoutRaw(
    requestParameters: PreviewCheckoutRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<PreviewCheckoutResponse>> {
    if (requestParameters["changeSubscriptionRequestBody"] == null) {
      throw new runtime.RequiredError(
        "changeSubscriptionRequestBody",
        'Required parameter "changeSubscriptionRequestBody" was null or undefined when calling previewCheckout().',
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
        path: `/checkout/preview`,
        method: "POST",
        headers: headerParameters,
        query: queryParameters,
        body: ChangeSubscriptionRequestBodyToJSON(
          requestParameters["changeSubscriptionRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      PreviewCheckoutResponseFromJSON(jsonValue),
    );
  }

  /**
   * Preview checkout
   */
  async previewCheckout(
    requestParameters: PreviewCheckoutRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<PreviewCheckoutResponse> {
    const response = await this.previewCheckoutRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }

  /**
   * Update payment method
   */
  async updatePaymentMethodRaw(
    requestParameters: UpdatePaymentMethodRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<runtime.ApiResponse<UpdatePaymentMethodResponse>> {
    if (requestParameters["updatePaymentMethodRequestBody"] == null) {
      throw new runtime.RequiredError(
        "updatePaymentMethodRequestBody",
        'Required parameter "updatePaymentMethodRequestBody" was null or undefined when calling updatePaymentMethod().',
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
        path: `/checkout/paymentmethod/update`,
        method: "POST",
        headers: headerParameters,
        query: queryParameters,
        body: UpdatePaymentMethodRequestBodyToJSON(
          requestParameters["updatePaymentMethodRequestBody"],
        ),
      },
      initOverrides,
    );

    return new runtime.JSONApiResponse(response, (jsonValue) =>
      UpdatePaymentMethodResponseFromJSON(jsonValue),
    );
  }

  /**
   * Update payment method
   */
  async updatePaymentMethod(
    requestParameters: UpdatePaymentMethodRequest,
    initOverrides?: RequestInit | runtime.InitOverrideFunction,
  ): Promise<UpdatePaymentMethodResponse> {
    const response = await this.updatePaymentMethodRaw(
      requestParameters,
      initOverrides,
    );
    return await response.value();
  }
}
