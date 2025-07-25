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
  type ComponentHydrateResponseData,
  type ConfigurationParameters,
} from "../api/checkoutexternal";
import {
  ComponentspublicApi,
  Configuration as PublicConfiguration,
} from "../api/componentspublic";
import { FETCH_DEBOUNCE_TIMEOUT, debounceOptions } from "../const";
import type { DeepPartial } from "../types";
import { ERROR_UNKNOWN, isError } from "../utils";

import { EmbedContext } from "./EmbedContext";
import { reducer } from "./embedReducer";
import {
  initialState,
  type CheckoutState,
  type EmbedLayout,
  type EmbedSettings,
} from "./embedState";

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

  const customHeaders = useMemo(
    () => ({
      "X-Schematic-Components-Version":
        process.env.SCHEMATIC_COMPONENTS_VERSION || "unknown",
      "X-Schematic-Session-ID": sessionIdRef.current,
    }),
    [],
  );

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
  }, [api.public]);

  const debouncedHydratePublic = useMemo(
    () => debounce(hydratePublic, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [hydratePublic],
  );

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
    () => debounce(hydrateComponent, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [hydrateComponent],
  );

  const hydrateExternal = useCallback(async function (
    fn: () => Promise<ComponentHydrateResponseData>,
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
    () => debounce(hydrateExternal, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [hydrateExternal],
  );

  // api methods
  const createSetupIntent = useCallback(async () => {
    return api.checkout?.createSetupIntent();
  }, [api.checkout]);

  const debouncedCreateSetupIntent = useMemo(
    () => debounce(createSetupIntent, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
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
      debounce(updatePaymentMethod, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
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
      debounce(deletePaymentMethod, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [deletePaymentMethod],
  );

  const checkout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      const response = await api.checkout?.checkout({
        changeSubscriptionRequestBody,
      });

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

  const debouncedCheckout = useMemo(
    () => debounce(checkout, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [checkout],
  );

  const previewCheckout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      return api.checkout?.previewCheckout({ changeSubscriptionRequestBody });
    },
    [api.checkout],
  );

  const debouncedPreviewCheckout = useMemo(
    () => debounce(previewCheckout, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [previewCheckout],
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
    () => debounce(unsubscribe, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
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
    () => debounce(getUpcomingInvoice, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [getUpcomingInvoice],
  );

  const listInvoices = useCallback(async () => {
    return api.checkout?.listInvoices();
  }, [api.checkout]);

  const debouncedListInvoices = useMemo(
    () => debounce(listInvoices, FETCH_DEBOUNCE_TIMEOUT, debounceOptions),
    [listInvoices],
  );

  // components
  const setError = useCallback((error: Error) => {
    dispatch({ type: "ERROR", error });
  }, []);

  const setAccessToken = useCallback((token: string) => {
    dispatch({ type: "SET_ACCESS_TOKEN", token });
  }, []);

  const setData = useCallback((data: ComponentHydrateResponseData) => {
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

    const darkModeQuery = matchMedia("(prefers-color-scheme: dark)");
    const colorMode = darkModeQuery.matches ? "dark" : "light";
    dispatch({
      type: "UPDATE_SETTINGS",
      settings: {
        theme: {
          colorMode,
        },
      },
    });

    darkModeQuery.addEventListener("change", (event) => {
      const newColorMode = event.matches ? "dark" : "light";
      dispatch({
        type: "UPDATE_SETTINGS",
        settings: { theme: { colorMode: newColorMode } },
      });
    });
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
        checkoutState: state.checkoutState,
        hydratePublic: debouncedHydratePublic,
        hydrateComponent: debouncedHydrateComponent,
        hydrateExternal: debouncedHydrateExternal,
        createSetupIntent: debouncedCreateSetupIntent,
        updatePaymentMethod: debouncedUpdatePaymentMethod,
        deletePaymentMethod: debouncedDeletePaymentMethod,
        checkout: debouncedCheckout,
        previewCheckout: debouncedPreviewCheckout,
        unsubscribe: debouncedUnsubscribe,
        getUpcomingInvoice: debouncedGetUpcomingInvoice,
        listInvoices: debouncedListInvoices,
        setError,
        setAccessToken,
        setLayout,
        setCheckoutState,
        setData,
        updateSettings,
      }}
    >
      <ThemeProvider theme={state.settings.theme}>
        <IconStyles />
        {children}
      </ThemeProvider>
    </EmbedContext.Provider>
  );
};
