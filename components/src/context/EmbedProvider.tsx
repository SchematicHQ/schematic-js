import "../localization";

import { IconStyles } from "@schematichq/schematic-icons";
import debounce from "lodash/debounce";
import merge from "lodash/merge";
import {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from "react";
import { ThemeProvider } from "styled-components";
import { v4 as uuidv4 } from "uuid";

import {
  CheckoutexternalApi,
  Configuration as CheckoutConfiguration,
  type ChangeSubscriptionRequestBody,
  type CheckoutResponseData,
  type ConfigurationParameters,
} from "../api/checkoutexternal";
import {
  ComponentspublicApi,
  Configuration as PublicConfiguration,
} from "../api/componentspublic";
import { FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS } from "../const";
import type { DeepPartial, HydrateDataWithCompanyContext } from "../types";
import { ERROR_UNKNOWN, isError } from "../utils";

import { EmbedContext } from "./EmbedContext";
import { reducer } from "./embedReducer";
import {
  initialState,
  type BypassConfig,
  type CheckoutState,
  type EmbedLayout,
  type EmbedSettings,
} from "./embedState";

const getCustomHeaders = (sessionId: string) => ({
  "X-Schematic-Components-Version":
    process.env.SCHEMATIC_COMPONENTS_VERSION || "unknown",
  "X-Schematic-Session-ID": sessionId,
});

export interface EmbedProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  apiConfig?: ConfigurationParameters;
  settings?: DeepPartial<EmbedSettings>;
  debug?: boolean;
}

export const EmbedProvider = ({
  children,
  apiKey,
  apiConfig,
  ...options
}: EmbedProviderProps) => {
  const sessionIdRef = useRef(uuidv4());
  const styleRef = useRef<HTMLLinkElement>(null);

  const [state, dispatch] = useReducer(reducer, options, (opts) => {
    const providedState = { settings: opts.settings || {} };
    const resolvedState = merge({}, initialState, providedState);

    return resolvedState;
  });

  const [api, setApi] = useState<{
    public?: ComponentspublicApi;
    checkout?: CheckoutexternalApi;
  }>({});

  const debug = useCallback(
    (message: string, ...args: unknown[]) => {
      if (options.debug) {
        console.debug(`[Schematic] ${message}`, ...args);
      }
    },
    [options.debug],
  );

  const finishCheckout = useCallback(
    (checkoutData: CheckoutResponseData) => {
      dispatch({
        type: "CHECKOUT",
        data: checkoutData,
      });
    },
    [dispatch],
  );

  // hydration

  /**
   * Retrieves company-specific data that does not require a user context
   * Used for standalone components where an access token is not required
   * Requires an api key to be passed to the embed provider
   */
  const hydratePublic = useCallback(async () => {
    dispatch({ type: "HYDRATE_STARTED" });

    if (!api.public && options.debug) {
      debug(
        "Error: Public API client is not initialized. Please provide an apiKey prop to EmbedProvider.",
      );
    }

    try {
      const response = await api.public?.getPublicPlans();

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
  }, [api.public, options.debug, debug]);

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
   * Retrieves company-specific data with user context
   * Used for standalone components when more control is needed
   * (e.g. triggering a checkout flow from a custom element)
   * Requires an access token to be managed externally
   */
  const hydrate = useCallback(async () => {
    dispatch({ type: "HYDRATE_STARTED" });

    try {
      const response = await api.checkout?.hydrate();

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
  }, [api.checkout]);

  const debouncedHydrate = useMemo(
    () => debounce(hydrate, FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS),
    [hydrate],
  );

  /**
   * Retrieves company-specific data with user context
   * Used when basic configuration can be managed from the components builder
   * Requires an access token to be managed externally
   */
  const hydrateComponent = useCallback(
    async (id: string) => {
      dispatch({ type: "HYDRATE_STARTED" });

      try {
        const response = await api.checkout?.hydrateComponent({
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
    [api.checkout],
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
   * Used for managing custom or preview data
   * Accepts a function that returns data in `hydrate` format
   */
  const hydrateExternal = useCallback(async function (
    fn: () => Promise<HydrateDataWithCompanyContext>,
  ) {
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
  }, []);

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
    return api.checkout?.createSetupIntent();
  }, [api.checkout]);

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
      const response = await api.checkout?.updatePaymentMethod({
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
    [api.checkout],
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
      const response = await api.checkout?.deletePaymentMethod({
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
    [api.checkout],
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
      const response = await api.checkout?.checkout({
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
    [api.checkout],
  );

  const debouncedCheckout = useMemo(
    () => debounce(checkout, FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS),
    [checkout],
  );

  const previewCheckout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      return api.checkout?.previewCheckout({ changeSubscriptionRequestBody });
    },
    [api.checkout],
  );

  const unsubscribe = useCallback(async () => {
    const response = await api.checkout?.checkoutUnsubscribe();

    if (response) {
      dispatch({
        type: "UNSUBSCRIBE",
        data: response.data,
      });
    }

    return response;
  }, [api.checkout]);

  const debouncedUnsubscribe = useMemo(
    () =>
      debounce(unsubscribe, FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS),
    [unsubscribe],
  );

  const getUpcomingInvoice = useCallback(
    async (id: string) => {
      return api.checkout?.hydrateUpcomingInvoice({
        componentId: id,
      });
    },
    [api.checkout],
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
    return api.checkout?.fetchCustomerBalance();
  }, [api.checkout]);

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
    return api.checkout?.listInvoices();
  }, [api.checkout]);

  const debouncedListInvoices = useMemo(
    () =>
      debounce(listInvoices, FETCH_DEBOUNCE_TIMEOUT, LEADING_DEBOUNCE_SETTINGS),
    [listInvoices],
  );

  // components
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

  const setCheckoutState = useCallback((state: CheckoutState) => {
    dispatch({ type: "SET_CHECKOUT_STATE", state });
  }, []);

  const clearCheckoutState = useCallback(() => {
    dispatch({ type: "CLEAR_CHECKOUT_STATE" });
  }, []);

  const initializeWithPlan = useCallback((config: string | BypassConfig) => {
    dispatch({ type: "SET_PLANID_BYPASS", config });
  }, []);

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
  }, [styleRef, state.settings.theme.typography]);

  useEffect(() => {
    if (apiKey) {
      const configParams = merge({}, apiConfig, {
        apiKey,
        headers: getCustomHeaders(sessionIdRef.current),
      });
      const publicApi = new ComponentspublicApi(
        new PublicConfiguration(configParams),
      );
      setApi((prev) => ({
        ...prev,
        public: publicApi,
      }));
    }
  }, [apiKey, apiConfig]);

  useEffect(() => {
    if (state.accessToken) {
      const configParams = merge({}, apiConfig, {
        apiKey: state.accessToken,
        headers: getCustomHeaders(sessionIdRef.current),
      });

      setApi((prev) => ({
        ...prev,
        checkout: new CheckoutexternalApi(
          new CheckoutConfiguration(configParams),
        ),
      }));
    }
  }, [state.accessToken, apiConfig]);

  useEffect(() => {
    if (options.settings) {
      updateSettings(options.settings, { update: true });
    }
  }, [options.settings, updateSettings]);

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

  return (
    <EmbedContext.Provider
      value={{
        isPending: state.isPending,
        stale: state.stale,
        data: state.data,
        error: state.error,
        settings: state.settings,
        layout: state.layout,
        checkoutState: state.checkoutState,
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
      }}
    >
      <ThemeProvider theme={state.settings.theme}>
        <IconStyles />
        {children}
      </ThemeProvider>
    </EmbedContext.Provider>
  );
};
