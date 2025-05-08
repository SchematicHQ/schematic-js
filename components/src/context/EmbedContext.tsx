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
import { type EmbedState, initialState } from "./embedState";

export interface EmbedContextProps extends EmbedState {
  hydratePublic: () => Promise<void>;
  hydrateComponent: (id: string, accessToken: string) => Promise<void>;
  listInvoices: (
    accessToken: string,
  ) => Promise<ListInvoicesResponse | undefined>;
  getSetupIntent: (
    componentId: string,
    accessToken: string,
  ) => Promise<GetSetupIntentResponse | undefined>;
  updatePaymentMethod: (
    paymentMethodId: string,
    accessToken: string,
  ) => Promise<UpdatePaymentMethodResponse | undefined>;
  deletePaymentMethod: (
    checkoutId: string,
    accessToken: string,
  ) => Promise<DeletePaymentMethodResponse | undefined>;
  previewCheckout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
    accessToken: string,
  ) => Promise<PreviewCheckoutResponse | undefined>;
  checkout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
    accessToken: string,
  ) => Promise<CheckoutResponse | undefined>;
  unsubscribe: (
    accessToken: string,
  ) => Promise<CheckoutUnsubscribeResponse | undefined>;
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
};

export const EmbedContext = createContext<EmbedContextProps>(initialContext);
