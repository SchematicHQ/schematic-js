import "../localization";

import { merge } from "lodash";
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
  type ChangeSubscriptionRequestBody,
  CheckoutexternalApi,
  Configuration as CheckoutConfiguration,
  type ConfigurationParameters,
} from "../api/checkoutexternal";
import {
  ComponentspublicApi,
  Configuration as PublicConfiguration,
} from "../api/componentspublic";
import { createDebouncedRequest, isError } from "../utils";
import { EmbedContext } from "./EmbedContext";
import { reducer } from "./embedReducer";
import {
  type EmbedSettings,
  type EmbedLayout,
  type CheckoutState,
  initialState,
} from "./embedState";
import { GlobalStyle } from "./globalStyle";

export interface EmbedProviderProps {
  children: React.ReactNode;
  apiKey?: string;
  apiConfig?: ConfigurationParameters;
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

  const [state, dispatch] = useReducer(reducer, initialState);

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
    const fn = createDebouncedRequest({ fn: api.public?.getPublicPlans });

    dispatch({ type: "HYDRATE_STARTED" });

    try {
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
        error: isError(err) ? err : new Error("An unknown error occurred."),
      });
    }
  }, [api.public]);

  const hydrateComponent = useCallback(
    async (id: string) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.hydrateComponent,
        params: { componentId: id },
      });

      dispatch({ type: "HYDRATE_STARTED" });

      try {
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
          error: isError(err) ? err : new Error("An unknown error occurred."),
        });
      }
    },
    [api.checkout],
  );

  // api methods
  const getSetupIntent = useCallback(async () => {
    const fn = createDebouncedRequest({
      fn: api.checkout?.getSetupIntent,
    });

    return fn();
  }, [api.checkout]);

  const updatePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.updatePaymentMethod,
        params: { updatePaymentMethodRequestBody: { paymentMethodId } },
      });

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
      const fn = createDebouncedRequest({
        fn: api.checkout?.deletePaymentMethod,
        params: { checkoutId: paymentMethodId },
      });

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
      const fn = createDebouncedRequest({
        fn: api.checkout?.checkout,
        params: { changeSubscriptionRequestBody },
      });

      return fn();
    },
    [api.checkout],
  );

  const previewCheckout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.previewCheckout,
        params: { changeSubscriptionRequestBody },
      });

      return fn();
    },
    [api.checkout],
  );

  const unsubscribe = useCallback(async () => {
    const fn = createDebouncedRequest({
      fn: api.checkout?.checkoutUnsubscribe,
    });

    return fn();
  }, [api.checkout]);

  const listInvoices = useCallback(async () => {
    const fn = createDebouncedRequest({
      fn: api.checkout?.listInvoices,
    });

    return fn();
  }, [api.checkout]);

  // components
  const setError = (error: Error) => {
    dispatch({ type: "ERROR", error });
  };

  const setAccessToken = (token: string) => {
    dispatch({ type: "SET_ACCESS_TOKEN", token });
  };

  const setSettings = (settings: EmbedSettings, update?: boolean) => {
    dispatch({ type: "SET_SETTINGS", settings, update });
  };

  const setLayout = (layout: EmbedLayout) => {
    dispatch({ type: "CHANGE_LAYOUT", layout });
  };

  const setCheckoutState = (state: CheckoutState) => {
    dispatch({ type: "SET_CHECKOUT_STATE", state });
  };

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

  useEffect(() => {
    if (state.accessToken?.length === 0) {
      dispatch({
        type: "ERROR",
        error: new Error("Please provide an access token."),
      });
    }

    if (!state.accessToken?.startsWith("token_")) {
      dispatch({
        type: "ERROR",
        error: new Error(
          'Invalid access token; your temporary access token will start with "token_".',
        ),
      });
    }
  }, [state.accessToken]);

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
      const configParams = { ...apiConfig, apiKey };
      merge(configParams.headers, customHeaders);
      setApi((prev) => ({
        ...prev,
        public: new ComponentspublicApi(new PublicConfiguration(configParams)),
      }));
    }
  }, [apiKey, apiConfig, customHeaders]);

  useEffect(() => {
    if (state.accessToken) {
      const config = { ...apiConfig, apiKey: state.accessToken };
      merge(config.headers, customHeaders);
      setApi((prev) => ({
        ...prev,
        checkout: new CheckoutexternalApi(new CheckoutConfiguration(config)),
      }));
    }
  }, [state.accessToken, apiConfig, customHeaders]);

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

  useEffect(() => {
    if (state.error) {
      debug(state.error.message);
    }
  }, [debug, state.error]);

  return (
    <ThemeProvider theme={state.settings.theme}>
      <GlobalStyle />
      <EmbedContext.Provider
        value={{
          isPending: state.isPending,
          data: state.data,
          error: state.error,
          settings: state.settings,
          layout: state.layout,
          mode: state.mode,
          hydratePublic,
          hydrateComponent,
          getSetupIntent,
          updatePaymentMethod,
          deletePaymentMethod,
          checkout,
          previewCheckout,
          unsubscribe,
          listInvoices,
          setError,
          setAccessToken,
          setSettings,
          setLayout,
          setCheckoutState,
        }}
      >
        {children}
      </EmbedContext.Provider>
    </ThemeProvider>
  );
};
