import merge from "lodash/merge";

import {
  type BillingSubscriptionResponseData,
  type ComponentHydrateResponseData,
  type DeleteResponse,
  type PaymentMethodResponseData,
} from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";
import type { DeepPartial, HydrateData } from "../types";
import { isCheckoutData } from "../utils";

import {
  defaultSettings,
  type CheckoutState,
  type EmbedLayout,
  type EmbedSettings,
  type EmbedState,
} from "./embedState";

const dispatchPlanChangedEvent = <T extends object>(detail: T) => {
  const event = new CustomEvent("plan-changed", {
    bubbles: true,
    detail,
  });
  window.dispatchEvent(event);
};

type EmbedAction =
  | { type: "SET_ACCESS_TOKEN"; token: string }
  | { type: "HYDRATE_STARTED" }
  | { type: "HYDRATE_PUBLIC"; data: PublicPlansResponseData }
  | { type: "HYDRATE"; data: ComponentHydrateResponseData }
  | { type: "HYDRATE_COMPONENT"; data: ComponentHydrateResponseData }
  | {
      type: "HYDRATE_EXTERNAL";
      data: HydrateData;
    }
  | { type: "CHECKOUT"; data: BillingSubscriptionResponseData }
  | { type: "UNSUBSCRIBE"; data: DeleteResponse }
  | { type: "UPDATE_PAYMENT_METHOD"; paymentMethod: PaymentMethodResponseData }
  | { type: "DELETE_PAYMENT_METHOD"; paymentMethodId: string }
  | { type: "RESET" }
  | { type: "ERROR"; error: Error }
  | { type: "SET_DATA"; data: ComponentHydrateResponseData }
  | {
      type: "UPDATE_SETTINGS";
      settings: DeepPartial<EmbedSettings>;
      update?: boolean;
    }
  | { type: "CHANGE_LAYOUT"; layout: EmbedLayout }
  | { type: "SET_CHECKOUT_STATE"; state: CheckoutState };

export const reducer = (state: EmbedState, action: EmbedAction): EmbedState => {
  switch (action.type) {
    case "SET_ACCESS_TOKEN": {
      return {
        ...state,
        accessToken: action.token,
        stale: true,
      };
    }

    case "HYDRATE_STARTED": {
      return {
        ...state,
        isPending: true,
      };
    }

    case "HYDRATE_PUBLIC":
    case "HYDRATE":
    case "HYDRATE_COMPONENT":
    case "HYDRATE_EXTERNAL": {
      return {
        ...state,
        data: action.data,
        error: undefined,
        isPending: false,
        stale: false,
      };
    }

    case "CHECKOUT":
    case "UNSUBSCRIBE": {
      dispatchPlanChangedEvent(action.data);

      return {
        ...state,
        stale: true,
      };
    }

    case "UPDATE_PAYMENT_METHOD": {
      if (!isCheckoutData(state.data)) {
        return state;
      }

      const data = { ...state.data };

      if (data.subscription) {
        data.subscription.paymentMethod = action.paymentMethod;
      }

      if (data.company) {
        const updatedPaymentMethods = data.company.paymentMethods.filter(
          (paymentMethod) => paymentMethod.id !== action.paymentMethod.id,
        );
        data.company.paymentMethods = [
          action.paymentMethod,
          ...updatedPaymentMethods,
        ];

        if (!data.subscription) {
          data.company.defaultPaymentMethod = action.paymentMethod;
        }
      }

      return {
        ...state,
        data,
      };
    }

    case "DELETE_PAYMENT_METHOD": {
      if (!isCheckoutData(state.data)) {
        return state;
      }

      const data = { ...state.data };

      if (data.company) {
        const paymentMethods = [...data.company.paymentMethods];
        data.company.paymentMethods = paymentMethods.filter(
          (paymentMethod) => paymentMethod.id !== action.paymentMethodId,
        );
      }

      return {
        ...state,
        data,
      };
    }

    case "RESET": {
      return {
        ...state,
        data: undefined,
      };
    }

    case "ERROR": {
      return {
        ...state,
        isPending: false,
        error: action.error,
      };
    }

    case "SET_DATA": {
      return {
        ...state,
        data: action.data,
      };
    }

    case "UPDATE_SETTINGS": {
      const settings = action.update
        ? merge({}, defaultSettings, state.settings, action.settings)
        : merge({}, defaultSettings, action.settings);

      return {
        ...state,
        settings,
      };
    }

    case "CHANGE_LAYOUT": {
      return {
        ...state,
        layout: action.layout,
      };
    }

    case "SET_CHECKOUT_STATE": {
      return {
        ...state,
        layout: "checkout",
        checkoutState: { ...action.state },
      };
    }
  }
};
