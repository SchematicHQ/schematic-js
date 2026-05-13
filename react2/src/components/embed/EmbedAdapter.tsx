import "../localization";

import { IconStyles } from "@schematichq/schematic-icons";
import debounce from "lodash/debounce";
import merge from "lodash/merge";
import React, {
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useReducer,
  useRef,
} from "react";
import { ThemeProvider } from "styled-components";
import { v4 as uuidv4 } from "uuid";

import { SchematicContext, type SchematicContextValue } from "../../context";
import {
  CheckoutexternalApi,
  Configuration as CheckoutConfiguration,
  type ChangeSubscriptionRequestBody,
  type CheckoutResponse,
  type CheckoutResponseData,
  type CheckoutUnsubscribeResponse,
  type ConfigurationParameters,
  type DeletePaymentMethodResponse,
  type FetchCustomerBalanceResponse,
  type GetSetupIntentResponse,
  type HydrateUpcomingInvoiceResponse,
  type ListInvoicesResponse,
  type PreviewCheckoutResponse,
  type UpdatePaymentMethodResponse,
} from "../api/checkoutexternal";
import {
  ComponentspublicApi,
  Configuration as PublicConfiguration,
  type PublicPlansResponseData,
} from "../api/componentspublic";
import { FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS } from "../const";
import type { DeepPartial, HydrateDataWithCompanyContext } from "../types";
import { ERROR_UNKNOWN, isError } from "../utils";

import { reducer } from "./embedReducer";
import {
  initialState,
  type BypassConfig,
  type CheckoutState,
  type EmbedLayout,
  type EmbedSettings,
  type EmbedState,
} from "./embedState";

// apis are not defined immediately on mount
type DebouncedApiPromise<R> = Promise<R | undefined> | undefined;

/**
 * The full embed surface exposed below an `EmbedAdapter`. `useEmbed` returns
 * exactly this shape. It's the same surface the old `EmbedContext` had.
 */
export interface EmbedContextValue extends EmbedState {
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
  setAccessToken: (token: string) => void;
  setError: (error: Error) => void;
  setLayout: (layout: EmbedLayout) => void;
  setCheckoutState: (state: CheckoutState) => void;
  clearCheckoutState: () => void;
  initializeWithPlan: (config: string | BypassConfig) => void;
  setData: (data: HydrateDataWithCompanyContext) => void;
  updateSettings: (
    settings: DeepPartial<EmbedSettings>,
    options?: { update?: boolean },
  ) => void;
  debug: (message: string, ...args: unknown[]) => void;
}

/**
 * Loose prop shape used at the adapter boundary so this component is
 * assignable to `SchematicEmbedAdapter` (which types `apiConfig` and
 * `settings` as `unknown`). The adapter narrows the values internally.
 */
export interface EmbedAdapterProps {
  children: React.ReactNode;
  /**
   * The same publishable key the WS client uses. The bare provider spreads
   * it through to this adapter and we authenticate the public REST API
   * with it.
   */
  publishableKey?: string;
  apiConfig?: unknown;
  settings?: unknown;
  debug?: boolean;
  /**
   * Restricts which currencies are presented in components that support
   * multi-currency display (PricingTable, CheckoutDialog). Entries are
   * ISO-4217 codes; case-insensitive. Omit to disable filtering.
   */
  currencyFilter?: string[];
}

const getCustomHeaders = (sessionId: string) => ({
  "X-Schematic-Components-Version":
    process.env.SCHEMATIC_COMPONENTS_VERSION || "unknown",
  "X-Schematic-Session-ID": sessionId,
});

const normalizeCurrencyFilter = (
  filter: string[] | undefined,
): string[] | undefined => {
  if (!filter || filter.length === 0) return undefined;
  return Array.from(new Set(filter.map((c) => c.toUpperCase())));
};

/**
 * The embed surface adapter. Mounted as a child of `SchematicProvider` when
 * `embed={EmbedAdapter}` is supplied — picks up the WS client from the
 * parent `SchematicContext`, sets up the REST clients + embed reducer, then
 * re-provides `SchematicContext` with the `embed` slot populated.
 *
 * This is an implementation detail; /components users get it pre-bound via
 * the convenience wrapper in `@schematichq/schematic-react2/components`.
 */
export const EmbedAdapter: React.FC<EmbedAdapterProps> = ({
  children,
  publishableKey,
  apiConfig: rawApiConfig,
  settings: rawSettings,
  debug: debugFlag,
  currencyFilter,
}) => {
  const parent = useContext(SchematicContext);

  // The provider types embed adapter props loosely so the bare provider
  // doesn't pull in REST/embed types. Narrow here.
  const apiConfig = rawApiConfig as ConfigurationParameters | undefined;
  const providedSettings = rawSettings as
    | DeepPartial<EmbedSettings>
    | undefined;

  const sessionId = useMemo(() => uuidv4(), []);
  const styleRef = useRef<HTMLLinkElement>(null);

  const [state, dispatch] = useReducer(
    reducer,
    { settings: providedSettings, currencyFilter },
    (opts) => {
      const providedState = {
        settings: opts.settings || {},
        currencyFilter: normalizeCurrencyFilter(opts.currencyFilter),
      };
      return merge({}, initialState, providedState);
    },
  );

  const publicApi = useMemo(() => {
    if (!publishableKey) return undefined;
    const configParams = merge({}, apiConfig, {
      // OpenAPI client's auth parameter is named `apiKey`; the value is the
      // same publishable key the WS client uses.
      apiKey: publishableKey,
      headers: getCustomHeaders(sessionId),
    });
    return new ComponentspublicApi(new PublicConfiguration(configParams));
  }, [publishableKey, apiConfig, sessionId]);

  const checkoutApi = useMemo(() => {
    if (!state.accessToken) return undefined;
    const configParams = merge({}, apiConfig, {
      apiKey: state.accessToken,
      headers: getCustomHeaders(sessionId),
    });
    return new CheckoutexternalApi(new CheckoutConfiguration(configParams));
  }, [state.accessToken, apiConfig, sessionId]);

  const debug = useCallback(
    (message: string, ...args: unknown[]) => {
      if (debugFlag) {
        console.debug(`[Schematic] ${message}`, ...args);
      }
    },
    [debugFlag],
  );

  const finishCheckout = useCallback((checkoutData: CheckoutResponseData) => {
    dispatch({
      type: "CHECKOUT",
      data: checkoutData,
    });
  }, []);

  // hydration

  /**
   * Retrieves company-specific data that does not require a user context.
   * Used for standalone components where an access token is not required.
   * Requires an api key to be passed to the provider.
   */
  const hydratePublic = useCallback(async () => {
    dispatch({ type: "HYDRATE_STARTED" });

    if (!publicApi) {
      console.warn(
        "Error: Public API client is not initialized. Please provide a publishableKey prop to SchematicProvider.",
      );
    }

    try {
      const response = await publicApi?.getPublicPlans();

      if (response) {
        dispatch({
          type: "HYDRATE_PUBLIC",
          data: response.data,
        });
      }

      return response?.data;
    } catch (err) {
      dispatch({
        type: "ERROR",
        error: isError(err) ? err : ERROR_UNKNOWN,
      });
    }
  }, [publicApi]);

  const debouncedHydratePublic = useMemo(
    () =>
      debounce(
        hydratePublic,
        FETCH_DEBOUNCE_TIMEOUT,
        LEADING_DEBOUNCE_SETTINGS,
      ),
    [hydratePublic],
  );

  /**
   * Retrieves company-specific data with user context.
   * Used for standalone components when more control is needed
   * (e.g. triggering a checkout flow from a custom element).
   * Requires an access token to be managed externally.
   */
  const hydrate = useCallback(async () => {
    dispatch({ type: "HYDRATE_STARTED" });

    try {
      const response = await checkoutApi?.hydrate();

      if (response) {
        dispatch({
          type: "HYDRATE",
          data: response.data,
        });
      }

      return response?.data;
    } catch (err) {
      dispatch({
        type: "ERROR",
        error: isError(err) ? err : ERROR_UNKNOWN,
      });
    }
  }, [checkoutApi]);

  const debouncedHydrate = useMemo(
    () => debounce(hydrate, FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS),
    [hydrate],
  );

  /**
   * Retrieves component-specific data with user context.
   * Used when basic configuration can be managed from the components builder.
   * Requires an access token to be managed externally.
   */
  const hydrateComponent = useCallback(
    async (id: string) => {
      dispatch({ type: "HYDRATE_STARTED" });

      try {
        const response = await checkoutApi?.hydrateComponent({
          componentId: id,
        });

        if (response) {
          dispatch({
            type: "HYDRATE_COMPONENT",
            data: response.data,
          });
        }

        return response?.data;
      } catch (err) {
        dispatch({
          type: "ERROR",
          error: isError(err) ? err : ERROR_UNKNOWN,
        });
      }
    },
    [checkoutApi],
  );

  const debouncedHydrateComponent = useMemo(
    () =>
      debounce(
        hydrateComponent,
        FETCH_DEBOUNCE_TIMEOUT,
        LEADING_DEBOUNCE_SETTINGS,
      ),
    [hydrateComponent],
  );

  /**
   * Used for managing custom or preview data.
   * Accepts a function that returns data in `hydrate` format.
   */
  const hydrateExternal = useCallback(
    async (fn: () => Promise<HydrateDataWithCompanyContext>) => {
      dispatch({ type: "HYDRATE_STARTED" });

      try {
        const response = await fn();

        dispatch({
          type: "HYDRATE_EXTERNAL",
          data: response,
        });

        return response;
      } catch (err) {
        dispatch({
          type: "ERROR",
          error: isError(err) ? err : ERROR_UNKNOWN,
        });
      }
    },
    [],
  );

  const debouncedHydrateExternal = useMemo(
    () =>
      debounce(
        hydrateExternal,
        FETCH_DEBOUNCE_TIMEOUT,
        LEADING_DEBOUNCE_SETTINGS,
      ),
    [hydrateExternal],
  );

  // api methods
  const createSetupIntent = useCallback(async () => {
    return checkoutApi?.createSetupIntent();
  }, [checkoutApi]);

  const debouncedCreateSetupIntent = useMemo(
    () =>
      debounce(
        createSetupIntent,
        FETCH_DEBOUNCE_TIMEOUT,
        LEADING_DEBOUNCE_SETTINGS,
      ),
    [createSetupIntent],
  );

  const updatePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      const response = await checkoutApi?.updatePaymentMethod({
        updatePaymentMethodRequestBody: { paymentMethodId },
      });

      if (response) {
        dispatch({
          type: "UPDATE_PAYMENT_METHOD",
          paymentMethod: response.data,
        });
      }

      return response;
    },
    [checkoutApi],
  );

  const debouncedUpdatePaymentMethod = useMemo(
    () =>
      debounce(
        updatePaymentMethod,
        FETCH_DEBOUNCE_TIMEOUT,
        LEADING_DEBOUNCE_SETTINGS,
      ),
    [updatePaymentMethod],
  );

  const deletePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      const response = await checkoutApi?.deletePaymentMethod({
        checkoutId: paymentMethodId,
      });

      if (response) {
        dispatch({
          type: "DELETE_PAYMENT_METHOD",
          paymentMethodId,
        });
      }

      return response;
    },
    [checkoutApi],
  );

  const debouncedDeletePaymentMethod = useMemo(
    () =>
      debounce(
        deletePaymentMethod,
        FETCH_DEBOUNCE_TIMEOUT,
        LEADING_DEBOUNCE_SETTINGS,
      ),
    [deletePaymentMethod],
  );

  const checkout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      const response = await checkoutApi?.checkout({
        changeSubscriptionRequestBody,
      });

      if (response && !response.data.confirmPaymentIntentClientSecret) {
        dispatch({
          type: "CHECKOUT",
          data: response.data,
        });
      }

      return response;
    },
    [checkoutApi],
  );

  const debouncedCheckout = useMemo(
    () => debounce(checkout, FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS),
    [checkout],
  );

  const previewCheckout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      return checkoutApi?.previewCheckout({ changeSubscriptionRequestBody });
    },
    [checkoutApi],
  );

  const unsubscribe = useCallback(async () => {
    const response = await checkoutApi?.checkoutUnsubscribe();

    if (response) {
      dispatch({
        type: "UNSUBSCRIBE",
        data: response.data,
      });
    }

    return response;
  }, [checkoutApi]);

  const debouncedUnsubscribe = useMemo(
    () =>
      debounce(unsubscribe, FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS),
    [unsubscribe],
  );

  const getUpcomingInvoice = useCallback(
    async (id: string) => {
      return checkoutApi?.hydrateUpcomingInvoice({
        componentId: id,
      });
    },
    [checkoutApi],
  );

  const debouncedGetUpcomingInvoice = useMemo(
    () =>
      debounce(
        getUpcomingInvoice,
        FETCH_DEBOUNCE_TIMEOUT,
        LEADING_DEBOUNCE_SETTINGS,
      ),
    [getUpcomingInvoice],
  );

  const getCustomerBalance = useCallback(async () => {
    return checkoutApi?.fetchCustomerBalance();
  }, [checkoutApi]);

  const debouncedGetCustomerBalance = useMemo(
    () =>
      debounce(
        getCustomerBalance,
        FETCH_DEBOUNCE_TIMEOUT,
        LEADING_DEBOUNCE_SETTINGS,
      ),
    [getCustomerBalance],
  );

  const listInvoices = useCallback(async () => {
    return checkoutApi?.listInvoices();
  }, [checkoutApi]);

  const debouncedListInvoices = useMemo(
    () =>
      debounce(listInvoices, FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS),
    [listInvoices],
  );

  // setters
  const setError = useCallback(
    (error: Error) => {
      debug(error.message);
      dispatch({ type: "ERROR", error });
    },
    [debug],
  );

  const setAccessToken = useCallback((token: string) => {
    dispatch({ type: "SET_ACCESS_TOKEN", token });
  }, []);

  const setData = useCallback((data: HydrateDataWithCompanyContext) => {
    dispatch({ type: "SET_DATA", data });
  }, []);

  const updateSettings = useCallback(
    (
      settings: DeepPartial<EmbedSettings> = {},
      options?: { update?: boolean },
    ) => {
      dispatch({ type: "UPDATE_SETTINGS", settings, update: options?.update });
    },
    [],
  );

  const setLayout = useCallback((layout: EmbedLayout) => {
    dispatch({ type: "CHANGE_LAYOUT", layout });
  }, []);

  const setCheckoutState = useCallback((checkoutState: CheckoutState) => {
    dispatch({ type: "SET_CHECKOUT_STATE", state: checkoutState });
  }, []);

  const clearCheckoutState = useCallback(() => {
    dispatch({ type: "CLEAR_CHECKOUT_STATE" });
  }, []);

  const initializeWithPlan = useCallback((config: string | BypassConfig) => {
    dispatch({ type: "SET_PLANID_BYPASS", config });
  }, []);

  // dark-mode + font-stylesheet setup
  useEffect(() => {
    const element = document.getElementById(
      "schematic-fonts",
    ) as HTMLLinkElement;
    if (element) {
      styleRef.current = element;
    } else {
      const style = document.createElement("link");
      style.id = "schematic-fonts";
      style.rel = "stylesheet";
      document.head.appendChild(style);
      styleRef.current = style;
    }

    const darkModeQuery = matchMedia("(prefers-color-scheme: dark)");
    const colorMode = darkModeQuery.matches ? "dark" : "light";
    dispatch({
      type: "UPDATE_SETTINGS",
      settings: { theme: { colorMode } },
      update: true,
    });

    function darkModeQueryHandler(event: MediaQueryListEvent) {
      const newColorMode = event.matches ? "dark" : "light";
      dispatch({
        type: "UPDATE_SETTINGS",
        settings: { theme: { colorMode: newColorMode } },
        update: true,
      });
    }

    darkModeQuery.addEventListener("change", darkModeQueryHandler);

    return () => {
      darkModeQuery.removeEventListener("change", darkModeQueryHandler);
    };
  }, []);

  // font href update
  useEffect(() => {
    const fontSet = new Set<string>([]);
    Object.values(state.settings.theme.typography).forEach(({ fontFamily }) => {
      fontSet.add(fontFamily);
    });

    if (fontSet.size > 0) {
      const weights = new Array(9).fill(0).map((_, i) => (i + 1) * 100);
      const src = `https://fonts.googleapis.com/css2?${[...fontSet]
        .map(
          (fontFamily) =>
            `family=${fontFamily}:wght@${weights.join(";")}&display=swap`,
        )
        .join("&")}`;
      if (styleRef.current) {
        styleRef.current.href = src;
      }
    }
  }, [state.settings.theme.typography]);

  // propagate settings prop changes into reducer
  useEffect(() => {
    if (providedSettings) {
      updateSettings(providedSettings, { update: true });
    }
  }, [providedSettings, updateSettings]);

  // propagate currencyFilter prop changes into reducer
  useEffect(() => {
    dispatch({
      type: "SET_CURRENCY_FILTER",
      currencyFilter: normalizeCurrencyFilter(currencyFilter),
    });
  }, [currencyFilter]);

  // forward plan-changed events to debug
  useEffect(() => {
    function planChangedHandler(event: Event) {
      if (event instanceof CustomEvent) {
        debug("plan changed", event.detail);
      }
    }

    window.addEventListener("plan-changed", planChangedHandler);

    return () => {
      window.removeEventListener("plan-changed", planChangedHandler);
    };
  }, [debug]);

  const embedValue = useMemo<EmbedContextValue>(
    () => ({
      isPending: state.isPending,
      stale: state.stale,
      accessToken: state.accessToken,
      data: state.data,
      error: state.error,
      settings: state.settings,
      layout: state.layout,
      checkoutState: state.checkoutState,
      currencyFilter: state.currencyFilter,
      hydratePublic: debouncedHydratePublic,
      hydrate: debouncedHydrate,
      hydrateComponent: debouncedHydrateComponent,
      hydrateExternal: debouncedHydrateExternal,
      createSetupIntent: debouncedCreateSetupIntent,
      updatePaymentMethod: debouncedUpdatePaymentMethod,
      deletePaymentMethod: debouncedDeletePaymentMethod,
      checkout: debouncedCheckout,
      previewCheckout,
      unsubscribe: debouncedUnsubscribe,
      getUpcomingInvoice: debouncedGetUpcomingInvoice,
      getCustomerBalance: debouncedGetCustomerBalance,
      listInvoices: debouncedListInvoices,
      finishCheckout,
      setError,
      setAccessToken,
      setLayout,
      setCheckoutState,
      clearCheckoutState,
      initializeWithPlan,
      setData,
      updateSettings,
      debug,
    }),
    [
      state.isPending,
      state.stale,
      state.accessToken,
      state.data,
      state.error,
      state.settings,
      state.layout,
      state.checkoutState,
      state.currencyFilter,
      debouncedHydratePublic,
      debouncedHydrate,
      debouncedHydrateComponent,
      debouncedHydrateExternal,
      debouncedCreateSetupIntent,
      debouncedUpdatePaymentMethod,
      debouncedDeletePaymentMethod,
      debouncedCheckout,
      previewCheckout,
      debouncedUnsubscribe,
      debouncedGetUpcomingInvoice,
      debouncedGetCustomerBalance,
      debouncedListInvoices,
      finishCheckout,
      setError,
      setAccessToken,
      setLayout,
      setCheckoutState,
      clearCheckoutState,
      initializeWithPlan,
      setData,
      updateSettings,
      debug,
    ],
  );

  const contextValue = useMemo<SchematicContextValue>(
    () => ({ client: parent.client, embed: embedValue }),
    [parent.client, embedValue],
  );

  return (
    <SchematicContext.Provider value={contextValue}>
      <ThemeProvider theme={state.settings.theme}>
        <IconStyles />
        {children}
      </ThemeProvider>
    </SchematicContext.Provider>
  );
};
