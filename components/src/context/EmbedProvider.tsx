import "../localization";

import { debounce, merge } from "lodash";
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
  type ConfigurationParameters,
} from "../api/checkoutexternal";
import {
  ComponentspublicApi,
  Configuration as PublicConfiguration,
} from "../api/componentspublic";
import { FETCH_DEBOUNCE_TIMEOUT, debounceOptions } from "../const";
import type { RecursivePartial } from "../types";
import { ERROR_UNKNOWN, isError } from "../utils";

import { EmbedContext } from "./EmbedContext";
import { reducer } from "./embedReducer";
import {
  initialState,
  type CheckoutState,
  type EmbedLayout,
  type EmbedSettings,
} from "./embedState";
import { GlobalStyle } from "./globalStyle";

export interface EmbedProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  apiConfig?: ConfigurationParameters;
  settings?: RecursivePartial<EmbedSettings>;
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

  // hydration
  const hydratePublic = useCallback(async () => {
    dispatch({ type: "HYDRATE_STARTED" });

    try {
      const fn = debounce(
        () => api.public?.getPublicPlans(),
        FETCH_DEBOUNCE_TIMEOUT,
        debounceOptions,
      );
      const response = await fn();
      if (response) {
        dispatch({
          type: "HYDRATE_PUBLIC",
          data: response.data,
        });
      }
    } catch (err) {
      dispatch({
        type: "ERROR",
        error: isError(err) ? err : ERROR_UNKNOWN,
      });
    }
  }, [api.public]);

  const hydrateComponent = useCallback(
    async (id: string) => {
      dispatch({ type: "HYDRATE_STARTED" });

      try {
        const fn = debounce(
          () => api.checkout?.hydrateComponent({ componentId: id }),
          FETCH_DEBOUNCE_TIMEOUT,
          debounceOptions,
        );

        const response = await fn();
        if (response) {
          dispatch({
            type: "HYDRATE_COMPONENT",
            data: response.data,
          });
        }
      } catch (err) {
        dispatch({
          type: "ERROR",
          error: isError(err) ? err : ERROR_UNKNOWN,
        });
      }
    },
    [api.checkout],
  );

  // api methods
  const createSetupIntent = useCallback(async () => {
    const fn = debounce(
      () => api.checkout?.createSetupIntent(),
      FETCH_DEBOUNCE_TIMEOUT,
      debounceOptions,
    );

    return fn();
  }, [api.checkout]);

  const updatePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      const fn = debounce(
        () =>
          api.checkout?.updatePaymentMethod({
            updatePaymentMethodRequestBody: { paymentMethodId },
          }),
        FETCH_DEBOUNCE_TIMEOUT,
        debounceOptions,
      );

      const response = await fn();
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

  const deletePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      const fn = debounce(
        () =>
          api.checkout?.deletePaymentMethod({ checkoutId: paymentMethodId }),
        FETCH_DEBOUNCE_TIMEOUT,
        debounceOptions,
      );

      const response = await fn();
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

  const checkout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      const fn = debounce(
        () => api.checkout?.checkout({ changeSubscriptionRequestBody }),
        FETCH_DEBOUNCE_TIMEOUT,
        debounceOptions,
      );

      const response = await fn();
      if (response) {
        dispatch({
          type: "CHECKOUT",
          data: response.data,
        });
      }

      return response;
    },
    [api.checkout],
  );

  const previewCheckout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      if (api.checkout) {
        return api.checkout.previewCheckout({ changeSubscriptionRequestBody });
      }
    },
    [api.checkout],
  );

  const debouncedPreviewCheckout = useMemo(
    () => debounce(previewCheckout, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [previewCheckout],
  );

  const unsubscribe = useCallback(async () => {
    const fn = debounce(
      () => api.checkout?.checkoutUnsubscribe(),
      FETCH_DEBOUNCE_TIMEOUT,
      debounceOptions,
    );

    const response = await fn();
    if (response) {
      dispatch({
        type: "UNSUBSCRIBE",
        data: response.data,
      });
    }

    return response;
  }, [api.checkout]);

  const getUpcomingInvoice = useCallback(
    async (id: string) => {
      const fn = debounce(
        () =>
          api.checkout?.hydrateUpcomingInvoice({
            componentId: id,
          }),
        FETCH_DEBOUNCE_TIMEOUT,
        debounceOptions,
      );

      return fn();
    },
    [api.checkout],
  );

  const listInvoices = useCallback(async () => {
    const fn = debounce(
      () => api.checkout?.listInvoices(),
      FETCH_DEBOUNCE_TIMEOUT,
      debounceOptions,
    );

    return fn();
  }, [api.checkout]);

  // components
  const setError = useCallback((error: Error) => {
    dispatch({ type: "ERROR", error });
  }, []);

  const setAccessToken = useCallback((token: string) => {
    dispatch({ type: "SET_ACCESS_TOKEN", token });
  }, []);

  const updateSettings = useCallback(
    (
      settings: RecursivePartial<EmbedSettings> = {},
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

  useEffect(() => {
    const element = document.getElementById(
      "schematic-fonts",
    ) as HTMLLinkElement;
    if (element) {
      styleRef.current = element;
      return;
    }

    const style = document.createElement("link");
    style.id = "schematic-fonts";
    style.rel = "stylesheet";
    document.head.appendChild(style);
    styleRef.current = style;
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

  const customHeaders = useMemo(
    () => ({
      "X-Schematic-Components-Version":
        process.env.SCHEMATIC_COMPONENTS_VERSION || "unknown",
      "X-Schematic-Session-ID": sessionIdRef.current,
    }),
    [],
  );

  useEffect(() => {
    if (apiKey) {
      const configParams = merge({}, apiConfig, {
        apiKey,
        headers: customHeaders,
      });
      const publicApi = new ComponentspublicApi(
        new PublicConfiguration(configParams),
      );
      setApi((prev) => ({
        ...prev,
        public: publicApi,
      }));
    }
  }, [apiKey, apiConfig, customHeaders]);

  useEffect(() => {
    if (state.accessToken) {
      const configParams = merge({}, apiConfig, {
        apiKey: state.accessToken,
        headers: customHeaders,
      });
      setApi((prev) => ({
        ...prev,
        checkout: new CheckoutexternalApi(
          new CheckoutConfiguration(configParams),
        ),
      }));
    }
  }, [state.accessToken, apiConfig, customHeaders]);

  useEffect(() => {
    if (state.error) {
      debug(state.error.message);
    }
  }, [debug, state.error]);

  useEffect(() => {
    const providedSettings = { ...(options.settings || {}) };
    updateSettings(providedSettings, { update: false });
  }, [options.settings, updateSettings]);

  useEffect(() => {
    const planChanged: EventListener = (event) => {
      if (event instanceof CustomEvent) {
        debug("plan changed", event.detail);
      }
    };

    window.addEventListener("plan-changed", planChanged);

    return () => {
      window.removeEventListener("plan-changed", planChanged);
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
        mode: state.mode,
        checkoutState: state.checkoutState,
        hydratePublic,
        hydrateComponent,
        createSetupIntent,
        updatePaymentMethod,
        deletePaymentMethod,
        checkout,
        previewCheckout: debouncedPreviewCheckout,
        unsubscribe,
        getUpcomingInvoice,
        listInvoices,
        setError,
        setAccessToken,
        setLayout,
        setCheckoutState,
        updateSettings,
      }}
    >
      <ThemeProvider theme={state.settings.theme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
    </EmbedContext.Provider>
  );
};
