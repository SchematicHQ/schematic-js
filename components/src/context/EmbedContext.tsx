import { createContext } from "react";

import {
  CheckoutResponseData,
  type ChangeSubscriptionRequestBody,
  type CheckoutResponse,
  type CheckoutUnsubscribeResponse,
  type DeletePaymentMethodResponse,
  type FetchCustomerBalanceResponse,
  type GetCheckoutTaxIDResponse,
  type GetCreditUsageByUserResponse,
  type GetFeatureUsageByUserResponse,
  type GetSetupIntentResponse,
  type HydrateUpcomingInvoiceResponse,
  type ListInvoicesResponse,
  type PreviewCheckoutResponse,
  type TaxIDInput,
  type UpdateCheckoutTaxIDResponse,
  type UpdatePaymentMethodResponse,
} from "../api/checkoutexternal";
import type { PublicPlansResponseData } from "../api/componentspublic";
import type { DeepPartial, HydrateDataWithCompanyContext } from "../types";

import {
  initialState,
  type BypassConfig,
  type CheckoutState,
  type EmbedLayout,
  type EmbedSettings,
  type EmbedState,
  type SettingsLayer,
} from "./embedState";

// apis are not defined immediately on mount
type DebouncedApiPromise<R> = Promise<R | undefined> | undefined;

// The settings layers are an implementation detail of the reducer; consumers read
// the resolved `settings` and write through `updateSettings`.
export interface EmbedContextProps extends Omit<EmbedState, SettingsLayer> {
  hydratePublic: () => DebouncedApiPromise<PublicPlansResponseData>;
  hydrate: () => DebouncedApiPromise<HydrateDataWithCompanyContext>;
  hydrateComponent: (
    id: string,
  ) => DebouncedApiPromise<HydrateDataWithCompanyContext>;
  hydrateExternal: (
    fn: () => Promise<HydrateDataWithCompanyContext>,
  ) => DebouncedApiPromise<HydrateDataWithCompanyContext>;
  getUpcomingInvoice: (
    id: string,
  ) => DebouncedApiPromise<HydrateUpcomingInvoiceResponse>;
  getCustomerBalance: () => DebouncedApiPromise<FetchCustomerBalanceResponse>;
  listInvoices: () => DebouncedApiPromise<ListInvoicesResponse>;
  getCreditUsageByUser: (
    billingCreditId: string,
    limit?: number,
  ) => DebouncedApiPromise<GetCreditUsageByUserResponse>;
  getFeatureUsageByUser: (
    featureId: string,
    limit?: number,
  ) => DebouncedApiPromise<GetFeatureUsageByUserResponse>;
  createSetupIntent: () => DebouncedApiPromise<GetSetupIntentResponse>;
  updatePaymentMethod: (
    paymentMethodId: string,
  ) => DebouncedApiPromise<UpdatePaymentMethodResponse>;
  deletePaymentMethod: (
    checkoutId: string,
  ) => DebouncedApiPromise<DeletePaymentMethodResponse>;
  previewCheckout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
  ) => DebouncedApiPromise<PreviewCheckoutResponse>;
  checkout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
  ) => DebouncedApiPromise<CheckoutResponse>;
  finishCheckout: (changeSubscriptionRequestBody: CheckoutResponseData) => void;
  unsubscribe: () => DebouncedApiPromise<CheckoutUnsubscribeResponse>;
  updateCustomFieldValues: (
    values: Record<string, string>,
  ) => Promise<void> | undefined;
  updateTaxId: (
    taxId: TaxIDInput,
  ) => Promise<UpdateCheckoutTaxIDResponse | undefined>;
  getTaxId: () => Promise<GetCheckoutTaxIDResponse | undefined>;
  setAccessToken: (token: string) => void;
  setError: (error: Error) => void;
  setLayout: (layout: EmbedLayout) => void;
  setCheckoutState: (state: CheckoutState) => void;
  clearCheckoutState: () => void;
  initializeWithPlan: (config: string | BypassConfig) => void;
  requestUnsubscribe: () => void;
  setData: (data: HydrateDataWithCompanyContext) => void;
  /**
   * Apply settings from the consuming app. These take precedence over the design
   * stored in the dashboard regardless of which arrives first, and survive the
   * re-hydration that follows a checkout or unsubscribe. Pass `{ update: true }`
   * to merge into the current values rather than replace them.
   */
  updateSettings: (
    settings: DeepPartial<EmbedSettings>,
    options?: { update?: boolean },
  ) => void;
  /**
   * Apply the design authored in the dashboard. Internal: `SchematicEmbed` calls
   * this with the settings inflated from the component AST. Anything supplied via
   * {@link EmbedContextProps.updateSettings} or the provider's `settings` prop
   * wins over it.
   */
  setBuilderSettings: (settings: DeepPartial<EmbedSettings>) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

export const stub = () => {
  throw new Error("You forgot to wrap your code with <EmbedProvider>.");
};

export const initialContext = {
  ...initialState,
  hydratePublic: stub,
  hydrate: stub,
  hydrateComponent: stub,
  hydrateExternal: stub,
  getUpcomingInvoice: stub,
  getCustomerBalance: stub,
  listInvoices: stub,
  getCreditUsageByUser: stub,
  getFeatureUsageByUser: stub,
  createSetupIntent: stub,
  updatePaymentMethod: stub,
  deletePaymentMethod: stub,
  previewCheckout: stub,
  checkout: stub,
  unsubscribe: stub,
  updateCustomFieldValues: stub,
  updateTaxId: stub,
  getTaxId: stub,
  setError: stub,
  setAccessToken: stub,
  setLayout: stub,
  setCheckoutState: stub,
  clearCheckoutState: stub,
  initializeWithPlan: stub,
  requestUnsubscribe: stub,
  setData: stub,
  updateSettings: stub,
  setBuilderSettings: stub,
  debug: stub,
  finishCheckout: stub,
};

export const EmbedContext = createContext<EmbedContextProps>(initialContext);
