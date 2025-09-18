import { createContext } from "react";

import {
  CheckoutResponseData,
  type ChangeSubscriptionRequestBody,
  type CheckoutResponse,
  type CheckoutUnsubscribeResponse,
  type ComponentHydrateResponseData,
  type DeletePaymentMethodResponse,
  type FetchCustomerBalanceResponse,
  type GetSetupIntentResponse,
  type HydrateUpcomingInvoiceResponse,
  type ListInvoicesResponse,
  type PreviewCheckoutResponse,
  type UpdatePaymentMethodResponse,
} from "../api/checkoutexternal";
import type { PublicPlansResponseData } from "../api/componentspublic";
import type { DeepPartial } from "../types";

import {
  initialState,
  type CheckoutState,
  type EmbedLayout,
  type EmbedSettings,
  type EmbedState,
} from "./embedState";

// apis are not defined immediately on mount
type DebouncedApiPromise<R> = Promise<R | undefined> | undefined;

export interface EmbedContextProps extends EmbedState {
  hydratePublic: () => DebouncedApiPromise<PublicPlansResponseData>;
  hydrate: () => DebouncedApiPromise<ComponentHydrateResponseData>;
  hydrateComponent: (
    id: string,
  ) => DebouncedApiPromise<ComponentHydrateResponseData>;
  hydrateExternal: (
    fn: () => Promise<ComponentHydrateResponseData>,
  ) => DebouncedApiPromise<ComponentHydrateResponseData>;
  getUpcomingInvoice: (
    id: string,
  ) => DebouncedApiPromise<HydrateUpcomingInvoiceResponse>;
  getCustomerBalance: () => DebouncedApiPromise<FetchCustomerBalanceResponse>;
  listInvoices: () => DebouncedApiPromise<ListInvoicesResponse>;
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
  finishCheckout: (checkoutData: CheckoutResponseData) => void;
  unsubscribe: () => DebouncedApiPromise<CheckoutUnsubscribeResponse>;
  setAccessToken: (token: string) => void;
  setError: (error: Error) => void;
  setLayout: (layout: EmbedLayout) => void;
  setCheckoutState: (state: CheckoutState) => void;
  setData: (data: ComponentHydrateResponseData) => void;
  updateSettings: (
    settings: DeepPartial<EmbedSettings>,
    options?: { update?: boolean },
  ) => void;
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
  createSetupIntent: stub,
  updatePaymentMethod: stub,
  deletePaymentMethod: stub,
  previewCheckout: stub,
  checkout: stub,
  finishCheckout: stub,
  unsubscribe: stub,
  setError: stub,
  setAccessToken: stub,
  setLayout: stub,
  setCheckoutState: stub,
  setData: stub,
  updateSettings: stub,
  debug: stub,
};

export const EmbedContext = createContext<EmbedContextProps>(initialContext);
