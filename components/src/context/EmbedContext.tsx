import { createContext } from "react";

import type {
  ChangeSubscriptionRequestBody,
  CheckoutResponse,
  CheckoutUnsubscribeResponse,
  DeletePaymentMethodResponse,
  GetSetupIntentResponse,
  ListInvoicesResponse,
  PreviewCheckoutResponse,
  UpdatePaymentMethodResponse,
} from "../api/checkoutexternal";
import {
  initialState,
  type TypographySettings,
  type ThemeSettings,
  type FontStyle,
  type EmbedSettings,
  type EmbedLayout,
  type CheckoutState,
  type EmbedMode,
  type EmbedState,
} from "./embedState";

export {
  type TypographySettings,
  type ThemeSettings,
  type FontStyle,
  type EmbedLayout,
  type CheckoutState,
  type EmbedMode,
};

export interface EmbedContextProps extends EmbedState {
  hydratePublic: () => Promise<void>;
  hydrateComponent: (id: string) => Promise<void>;
  listInvoices: () => Promise<ListInvoicesResponse | undefined>;
  getSetupIntent: () => Promise<GetSetupIntentResponse | undefined>;
  updatePaymentMethod: (
    paymentMethodId: string,
  ) => Promise<UpdatePaymentMethodResponse | undefined>;
  deletePaymentMethod: (
    checkoutId: string,
  ) => Promise<DeletePaymentMethodResponse | undefined>;
  previewCheckout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
  ) => Promise<PreviewCheckoutResponse | undefined>;
  checkout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
  ) => Promise<CheckoutResponse | undefined>;
  unsubscribe: () => Promise<CheckoutUnsubscribeResponse | undefined>;
  setAccessToken: (token: string) => void;
  setError: (error: Error) => void;
  setSettings: (settings: EmbedSettings, update?: boolean) => void;
  setLayout: (layout: EmbedLayout) => void;
  setCheckoutState: (state: CheckoutState) => void;
}

const stub = () => {
  throw new Error("You forgot to wrap your code with <EmbedProvider>.");
};

export const initialContext = {
  ...initialState,
  hydratePublic: stub,
  hydrateComponent: stub,
  listInvoices: stub,
  getSetupIntent: stub,
  updatePaymentMethod: stub,
  deletePaymentMethod: stub,
  previewCheckout: stub,
  checkout: stub,
  unsubscribe: stub,
  setError: stub,
  setAccessToken: stub,
  setSettings: stub,
  setLayout: stub,
  setCheckoutState: stub,
};

export const EmbedContext = createContext<EmbedContextProps>(initialContext);
