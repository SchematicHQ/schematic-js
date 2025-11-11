import merge from "lodash/merge";

import {
  type BillingSubscriptionResponseData,
  type DeleteResponse,
  type PaymentMethodResponseData,
} from "../api/checkoutexternal";
import { type PublicPlansResponseData } from "../api/componentspublic";
import type {
  DeepPartial,
  HydrateData,
  HydrateDataWithCompanyContext,
} from "../types";

import {
  defaultSettings,
  type BypassConfig,
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
  | { type: "HYDRATE"; data: HydrateDataWithCompanyContext }
  | { type: "HYDRATE_COMPONENT"; data: HydrateDataWithCompanyContext }
  | {
      type: "HYDRATE_EXTERNAL";
      data: HydrateDataWithCompanyContext;
    }
  | { type: "CHECKOUT"; data: BillingSubscriptionResponseData }
  | { type: "UNSUBSCRIBE"; data: DeleteResponse }
  | { type: "UPDATE_PAYMENT_METHOD"; paymentMethod: PaymentMethodResponseData }
  | { type: "DELETE_PAYMENT_METHOD"; paymentMethodId: string }
  | { type: "RESET" }
  | { type: "ERROR"; error: Error }
  | { type: "SET_DATA"; data: HydrateDataWithCompanyContext }
  | {
      type: "UPDATE_SETTINGS";
      settings: DeepPartial<EmbedSettings>;
      update?: boolean;
    }
  | { type: "CHANGE_LAYOUT"; layout: EmbedLayout }
  | { type: "SET_CHECKOUT_STATE"; state: CheckoutState }
  | { type: "SET_PLANID_BYPASS"; config: string | BypassConfig };

function normalize(data?: HydrateData): HydrateDataWithCompanyContext {
  return merge({}, data, {
    activePlans: data?.activePlans.map((plan) => ({
      companyCanTrial: false,
      current: false,
      valid: true,
      usageViolations: [],
      ...plan,
    })),
    activeAddOns: data?.activeAddOns.map((plan) => ({
      companyCanTrial: false,
      current: false,
      valid: true,
      usageViolations: [],
      ...plan,
    })),
    activeUsageBasedEntitlements: [],
    checkoutSettings: {
      collectAddress: false,
      collectEmail: false,
      collectPhone: false,
      taxCollectionEnabled: false,
    },
    creditBundles: [],
    creditGrants: [],
  });
}

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

    case "HYDRATE_PUBLIC": {
      return {
        ...state,
        data: normalize(action.data),
        error: undefined,
        isPending: false,
        stale: false,
      };
    }

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
      const updated = normalize(state.data);

      if (updated.subscription) {
        updated.subscription.paymentMethod = action.paymentMethod;
      }

      if (updated.company) {
        const updatedPaymentMethods = updated.company.paymentMethods.filter(
          (paymentMethod) => paymentMethod.id !== action.paymentMethod.id,
        );
        updated.company.paymentMethods = [
          action.paymentMethod,
          ...updatedPaymentMethods,
        ];

        if (!updated.subscription) {
          updated.company.defaultPaymentMethod = action.paymentMethod;
        }
      }

      return {
        ...state,
        data: updated,
      };
    }

    case "DELETE_PAYMENT_METHOD": {
      const updated = normalize(state.data);

      if (updated.company) {
        const paymentMethods = [...updated.company.paymentMethods];
        updated.company.paymentMethods = paymentMethods.filter(
          (paymentMethod) => paymentMethod.id !== action.paymentMethodId,
        );
      }

      return {
        ...state,
        data: updated,
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

    case "SET_PLANID_BYPASS": {
      // Handle both string (planId) and BypassConfig object
      const config = typeof action.config === "string"
        ? { planId: action.config, hideSkipped: false }
        : action.config;

      // Determine bypass flags based on explicit or implicit configuration
      let bypassPlanSelection: boolean;
      let bypassAddOnSelection: boolean;

      if (config.skipped !== undefined) {
        // Explicit mode: Use skipped configuration
        // Default planStage to true if not specified (maintain backwards compatible default)
        // Default addOnStage to false if not specified
        bypassPlanSelection = config.skipped.planStage ?? true;
        bypassAddOnSelection = config.skipped.addOnStage ?? false;
      } else {
        // Implicit mode (backwards compatibility): Derive from presence of IDs
        // Always skip plan when using initializeWithPlan
        bypassPlanSelection = true;
        // Only skip addon if addOnIds are provided
        bypassAddOnSelection = Boolean(config.addOnIds && config.addOnIds.length > 0);
      }

      return {
        ...state,
        layout: "checkout",
        checkoutState: {
          planId: config.planId,
          bypassPlanSelection,
          bypassAddOnSelection,
          ...(config.addOnIds && { addOnIds: config.addOnIds }),
          hideSkippedStages: config.hideSkipped ?? false,
        },
      };
    }
  }
};
