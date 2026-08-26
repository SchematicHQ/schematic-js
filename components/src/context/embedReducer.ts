import merge from "lodash/merge";

import {
  CheckoutBundlePurchaseBehavior,
  ProrationBehavior,
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
import { type CatalogOverlay } from "../utils/api/catalogAdapter";

import {
  SETTINGS_LAYERS,
  SETTINGS_LAYER_BY_SOURCE,
  resolveSettings,
  type BypassConfig,
  type CheckoutPrefill,
  type CheckoutState,
  type EmbedLayout,
  type EmbedSettings,
  type EmbedState,
  type SettingsLayer,
  type SettingsSource,
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
  | { type: "HYDRATE_CATALOG"; overlay: CatalogOverlay }
  | { type: "CHECKOUT"; data: BillingSubscriptionResponseData }
  | { type: "UNSUBSCRIBE"; data: DeleteResponse }
  | { type: "UPDATE_PAYMENT_METHOD"; paymentMethod: PaymentMethodResponseData }
  | { type: "DELETE_PAYMENT_METHOD"; paymentMethodId: string }
  | { type: "UPDATE_CUSTOM_FIELD_VALUES"; values: Record<string, string> }
  | { type: "RESET" }
  | { type: "ERROR"; error: Error }
  | { type: "SET_DATA"; data: HydrateDataWithCompanyContext }
  | {
      type: "UPDATE_SETTINGS";
      settings: DeepPartial<EmbedSettings>;
      update?: boolean;
      source?: SettingsSource;
    }
  | { type: "CHANGE_LAYOUT"; layout: EmbedLayout }
  | { type: "SET_CHECKOUT_STATE"; state: CheckoutState }
  | { type: "SET_PLANID_BYPASS"; config: string | BypassConfig }
  | { type: "CLEAR_CHECKOUT_STATE" }
  | { type: "SET_CURRENCY_FILTER"; currencyFilter?: string[] }
  | { type: "SET_CHECKOUT_PREFILL"; checkoutPrefill?: CheckoutPrefill };

const CHECKOUT_SETTINGS_DEFAULTS = {
  bundlePurchaseBehavior: CheckoutBundlePurchaseBehavior.Quantity,
  collectAddress: false,
  collectEmail: false,
  collectPhone: false,
  collectTaxId: false,
  prorationBehavior: ProrationBehavior.CreateProrations,
  taxCollectionEnabled: false,
};

function normalize(data?: HydrateData): HydrateDataWithCompanyContext {
  // Later merge sources win, so the defaults must come before `data` to only
  // fill fields the payload lacks (the public hydrate has no
  // checkoutSettings). normalize also runs on already-hydrated state
  // (payment-method and custom-field updates), where defaults-last would
  // reset settings the server sent.
  return merge(
    {},
    {
      activeUsageBasedEntitlements: [],
      checkoutSettings: CHECKOUT_SETTINGS_DEFAULTS,
      creditBundles: [],
      creditGrants: [],
      customCheckoutFields: [],
      preventSelfServiceDowngrade: false,
    },
    data,
    {
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
    },
  );
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

    case "HYDRATE_CATALOG": {
      // Spike seam: overlay the /catalog/view projection onto the hydrate
      // payload. Company state, usage, and the component AST stay
      // hydrate-sourced; only the catalog slices are replaced.
      if (!state.data) {
        return state;
      }

      return {
        ...state,
        data: {
          ...state.data,
          ...action.overlay,
        },
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

      if (updated.subscription?.paymentMethod?.id === action.paymentMethodId) {
        updated.subscription.paymentMethod = undefined;
      }

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

    case "UPDATE_CUSTOM_FIELD_VALUES": {
      const updated = normalize(state.data);

      updated.customCheckoutFields = updated.customCheckoutFields.map(
        (field) =>
          field.id in action.values
            ? { ...field, value: action.values[field.id] }
            : field,
      );

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
      const target = action.source
        ? SETTINGS_LAYER_BY_SOURCE[action.source]
        : "baseSettings";
      const targetIndex = SETTINGS_LAYERS.indexOf(target);

      // Each source writes to its own layer, so the effective settings no longer
      // depend on dispatch order: the dashboard design can land after the
      // consuming app's theme (it always does) without overwriting it.
      const layers = {} as Pick<EmbedState, SettingsLayer>;
      SETTINGS_LAYERS.forEach((layer, index) => {
        if (layer === target) {
          // Without `update`, the caller is asking to replace its settings
          // rather than merge into them.
          layers[layer] = action.update
            ? merge({}, state[layer], action.settings)
            : action.settings;
        } else {
          // A replace also discards the layers this one takes precedence over,
          // preserving the old "reset to defaults plus these values" behavior.
          layers[layer] =
            !action.update && index < targetIndex ? {} : state[layer];
        }
      });

      return {
        ...state,
        ...layers,
        settings: resolveSettings(layers),
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
      const isStringFormat = typeof action.config === "string";

      // Normalize string format to object format
      const config: BypassConfig = isStringFormat
        ? { planId: action.config as string, hideSkipped: false }
        : (action.config as BypassConfig);

      // Three behavior modes for stage skipping:
      // 1. Pre-Selection Mode (object without skipped): Show stages with pre-selected values
      // 2. Explicit Skip Mode (object with skipped): Precise control over which stages to skip
      // 3. Legacy String Mode: Pre-select plan and skip plan stage (backwards compatible)
      let bypassPlanSelection: boolean;
      let bypassAddOnSelection: boolean;
      let bypassCreditsSelection: boolean;
      let bypassUsageSelection: boolean;
      let bypassAddOnUsageSelection: boolean;

      if (config.skipped !== undefined) {
        // Mode 2: Explicit skip configuration provided
        // Use exactly what was specified (defaults to false if undefined)
        bypassPlanSelection = config.skipped.planStage ?? false;
        bypassAddOnSelection = config.skipped.addOnStage ?? false;
        bypassCreditsSelection = config.skipped.creditStage ?? false;
        bypassUsageSelection = config.skipped.usageStage ?? false;
        bypassAddOnUsageSelection = config.skipped.addOnUsageStage ?? false;
      } else if (isStringFormat) {
        // Mode 3: Legacy string format
        // Maintains backwards compatibility by skipping plan stage
        bypassPlanSelection = true;
        bypassAddOnSelection = false;
        bypassCreditsSelection = false;
        bypassUsageSelection = false;
        bypassAddOnUsageSelection = false;
      } else {
        // Mode 1: Pre-selection without explicit skip config
        // Show all stages with pre-selected values for user review
        bypassPlanSelection = false;
        bypassAddOnSelection = false;
        bypassCreditsSelection = false;
        bypassUsageSelection = false;
        bypassAddOnUsageSelection = false;
      }

      return {
        ...state,
        layout: "checkout",
        checkoutState: {
          ...(config.planId && { planId: config.planId }),
          ...(config.period && { period: config.period }),
          bypassPlanSelection,
          bypassAddOnSelection,
          bypassCreditsSelection,
          bypassUsageSelection,
          bypassAddOnUsageSelection,
          ...(config.addOnIds && { addOnIds: config.addOnIds }),
          ...(config.payInAdvanceQuantities && {
            payInAdvanceQuantities: config.payInAdvanceQuantities,
          }),
          ...(config.promoCode && { promoCode: config.promoCode }),
          ...(config.currency && {
            selectedCurrency: config.currency.toUpperCase(),
          }),
          ...(config.showCurrencySelector !== undefined && {
            showCurrencySelector: config.showCurrencySelector,
          }),
          ...(config.showBillingDisclaimer !== undefined && {
            showBillingDisclaimer: config.showBillingDisclaimer,
          }),
          hideSkippedStages: config.hideSkipped ?? false,
          startTrialIfAvailable:
            isStringFormat || config.startTrialIfAvailable === undefined
              ? true
              : config.startTrialIfAvailable,
        },
      };
    }

    case "CLEAR_CHECKOUT_STATE": {
      return {
        ...state,
        checkoutState: undefined,
      };
    }

    case "SET_CURRENCY_FILTER": {
      return {
        ...state,
        currencyFilter: action.currencyFilter,
      };
    }

    case "SET_CHECKOUT_PREFILL": {
      return {
        ...state,
        checkoutPrefill: action.checkoutPrefill,
      };
    }
  }
};
