import { createContext } from "react";

import type {
  ChangeSubscriptionRequestBody,
  CheckoutResponse,
  CheckoutUnsubscribeResponse,
  DeletePaymentMethodResponse,
  GetSetupIntentResponse,
  HydrateUpcomingInvoiceResponse,
  ListInvoicesResponse,
  PreviewCheckoutResponse,
  UpdatePaymentMethodResponse,
} from "../api/checkoutexternal";
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

export interface EmbedContextProps extends EmbedState {
  hydratePublic: () => Promise<void>;
  hydrateComponent: (id: string) => Promise<void>;
  getUpcomingInvoice: (
    id: string,
  ) => Promise<HydrateUpcomingInvoiceResponse | undefined>;
  listInvoices: () => Promise<ListInvoicesResponse | undefined>;
  createSetupIntent: () => Promise<GetSetupIntentResponse | undefined>;
  updatePaymentMethod: (
    paymentMethodId: string,
  ) => Promise<UpdatePaymentMethodResponse | undefined>;
  deletePaymentMethod: (
    checkoutId: string,
  ) => Promise<DeletePaymentMethodResponse | undefined>;
  previewCheckout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
  ) => Promise<PreviewCheckoutResponse | undefined> | undefined;
  checkout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
  ) => Promise<CheckoutResponse | undefined>;
  unsubscribe: () => Promise<CheckoutUnsubscribeResponse | undefined>;
  setAccessToken: (token: string) => void;
  setError: (error: Error) => void;
  setLayout: (layout: EmbedLayout) => void;
  setCheckoutState: (state: CheckoutState) => void;
  updateSettings: (
    settings: RecursivePartial<EmbedSettings>,
    options?: { update?: boolean },
  ) => void;
}

const stub = () => {
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
