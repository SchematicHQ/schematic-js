import { createContext } from "react";

import type {
  ChangeSubscriptionRequestBody,
  CheckoutResponse,
  CheckoutUnsubscribeResponse,
  DeletePaymentMethodResponse,
  GetSetupIntentResponse,
  HydrateComponentResponse,
  HydrateUpcomingInvoiceResponse,
  ListInvoicesResponse,
  PreviewCheckoutResponse,
  UpdatePaymentMethodResponse,
} from "../api/checkoutexternal";
import type { GetPublicPlansResponse } from "../api/componentspublic";
import type { RecursivePartial } from "../types";

import {
  initialState,
  type CheckoutState,
  type EmbedLayout,
  type EmbedMode,
  type EmbedSettings,
  type EmbedState,
  type FontStyle,
  type ThemeSettings,
  type TypographySettings,
} from "./embedState";

export {
  type CheckoutState,
  type EmbedLayout,
  type EmbedMode,
  type EmbedSettings,
  type EmbedState,
  type FontStyle,
  type ThemeSettings,
  type TypographySettings,
};

// apis are not defined immediately on mount
type DebouncedApiPromise<R> = Promise<R | undefined> | undefined;

export interface EmbedContextProps extends EmbedState {
  hydratePublic: () => DebouncedApiPromise<GetPublicPlansResponse>;
  hydrateComponent: (
    id: string,
  ) => DebouncedApiPromise<HydrateComponentResponse>;
  getUpcomingInvoice: (
    id: string,
  ) => DebouncedApiPromise<HydrateUpcomingInvoiceResponse>;
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
  unsubscribe: () => DebouncedApiPromise<CheckoutUnsubscribeResponse>;
  setAccessToken: (token: string) => void;
  setError: (error: Error) => void;
  setLayout: (layout: EmbedLayout) => void;
  setCheckoutState: (state: CheckoutState) => void;
  updateSettings: (
    settings: RecursivePartial<EmbedSettings>,
    options?: { update?: boolean },
  ) => void;
}

export const stub = () => {
  throw new Error("You forgot to wrap your code with <EmbedProvider>.");
};

export const initialContext = {
  ...initialState,
  hydratePublic: stub,
  hydrateComponent: stub,
  getUpcomingInvoice: stub,
  listInvoices: stub,
  createSetupIntent: stub,
  updatePaymentMethod: stub,
  deletePaymentMethod: stub,
  previewCheckout: stub,
  checkout: stub,
  unsubscribe: stub,
  setError: stub,
  setAccessToken: stub,
  setLayout: stub,
  setCheckoutState: stub,
  updateSettings: stub,
};

export const EmbedContext = createContext<EmbedContextProps>(initialContext);
