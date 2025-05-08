import "../localization";

import { debounce, merge } from "lodash";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
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
import { FETCH_DEBOUNCE_TIMEOUT } from "../const";
import { createDebouncedRequest, debounceOptions } from "../utils";
import { EmbedContext } from "./EmbedContext";
import { initialState } from "./embedState";
import { reducer } from "./reducer";

export interface EmbedProviderProps {
  children: React.ReactNode;
  apiKey: string;
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

  const hydratePublic = useCallback(async () => {
    const fn = debounce(
      async () => {
        dispatch({ type: "HYDRATE_STARTED" });

        try {
          if (!api.public) {
            return;
          }

          const { data } = await api.public.getPublicPlans();

          dispatch({
            type: "HYDRATE_PUBLIC",
            data,
          });
        } catch (error) {
          dispatch({
            type: "ERROR",
            error:
              error instanceof Error
                ? error
                : new Error("An unknown error occurred."),
          });
        }
      },
      FETCH_DEBOUNCE_TIMEOUT,
      debounceOptions,
    );

    return fn();
  }, [api.public]);

  const hydrateComponent = useCallback(
    async (id: string, accessToken: string) => {
      const fn = debounce(
        async () => {
          dispatch({ type: "HYDRATE_STARTED" });

          try {
            if (!api.checkout) {
              return;
            }

            const response = await api.checkout.hydrateComponent(
              {
                componentId: id,
              },
              {
                headers: {
                  "X-Schematic-Api-Key": accessToken,
                },
              },
            );
            const { data } = response;

            dispatch({
              type: "HYDRATE_COMPONENT",
              data,
            });
          } catch (error) {
            dispatch({
              type: "ERROR",
              error:
                error instanceof Error
                  ? error
                  : new Error("An unknown error occurred."),
            });
          }
        },
        FETCH_DEBOUNCE_TIMEOUT,
        debounceOptions,
      );

      fn();
    },
    [api.checkout],
  );

  // TODO: api methods
  const getSetupIntent = useCallback(
    async (componentId: string, accessToken: string) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.getSetupIntent,
        params: { componentId },
        token: accessToken,
      });

      return fn();
    },
    [api.checkout],
  );

  const updatePaymentMethod = useCallback(
    async (paymentMethodId: string, accessToken: string) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.updatePaymentMethod,
        params: { updatePaymentMethodRequestBody: { paymentMethodId } },
        token: accessToken,
      });

      return fn();
    },
    [api.checkout],
  );

  const deletePaymentMethod = useCallback(
    async (checkoutId: string, accessToken: string) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.deletePaymentMethod,
        params: { checkoutId },
        token: accessToken,
      });

      return fn();
    },
    [api.checkout],
  );

  const checkout = useCallback(
    async (
      changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
      accessToken: string,
    ) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.checkout,
        params: {
          changeSubscriptionRequestBody,
        },
        token: accessToken,
      });

      return fn();
    },
    [api.checkout],
  );

  const previewCheckout = useCallback(
    async (
      changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
      accessToken: string,
    ) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.previewCheckout,
        params: {
          changeSubscriptionRequestBody,
        },
        token: accessToken,
      });

      return fn();
    },
    [api.checkout],
  );

  const unsubscribe = useCallback(
    async (accessToken: string) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.checkoutUnsubscribe,
        params: {},
        token: accessToken,
      });

      return fn();
    },
    [api.checkout],
  );

  const listInvoices = useCallback(
    async (accessToken: string) => {
      const fn = createDebouncedRequest({
        fn: api.checkout?.listInvoices,
        params: {},
        token: accessToken,
      });

      return fn();
    },
    [api.checkout],
  );

  useEffect(() => {
    if (apiKey) {
      const configParams = { ...apiConfig, apiKey };
      merge(configParams.headers, {
        "X-Schematic-Components-Version":
          process.env.SCHEMATIC_COMPONENTS_VERSION || "unknown",
        "X-Schematic-Session-ID": sessionIdRef.current,
      });

      const publicConfig = new PublicConfiguration(configParams);
      const checkoutConfig = new CheckoutConfiguration(configParams);

      setApi((prev) => ({
        ...prev,
        public: new ComponentspublicApi(publicConfig),
        checkout: new CheckoutexternalApi(checkoutConfig),
      }));
    }
  }, [apiKey, apiConfig]);

  useEffect(() => {
    const planChanged: EventListener = (event) => {
      if (!(event instanceof CustomEvent)) {
        return;
      }

      debug("plan changed", event.detail);
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
        data: state.data,
        error: state.error,
        hydratePublic,
        hydrateComponent,
        getSetupIntent,
        updatePaymentMethod,
        deletePaymentMethod,
        checkout,
        previewCheckout,
        unsubscribe,
        listInvoices,
      }}
    >
      {children}
    </EmbedContext.Provider>
  );
};
