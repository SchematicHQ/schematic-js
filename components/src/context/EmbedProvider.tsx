import "../localization";

import { debounce, merge } from "lodash";
import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  CheckoutexternalApi,
  Configuration as CheckoutConfiguration,
  type ConfigurationParameters,
} from "../api/checkoutexternal";
import {
  ComponentspublicApi,
  Configuration as PublicConfiguration,
} from "../api/componentspublic";
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
  const styleRef = useRef<HTMLElement>(null);
  const sessionIdRef = useRef(uuidv4());

  const [state, dispatch] = useReducer(reducer, initialState);

  const [api, setApi] = useState<{
    checkoutExternalApi?: CheckoutexternalApi;
    componentsPublicApi?: ComponentspublicApi;
  }>({});

  const debug = useCallback(
    (message: string, ...args: unknown[]) => {
      if (options.debug) {
        console.debug(`[Schematic] ${message}`, ...args);
      }
    },
    [options.debug],
  );

  const getPublicPlans = useCallback(async () => {
    const fn = debounce(
      async () => {
        dispatch({ type: "DATA_FETCH_STARTED" });

        try {
          if (!api.componentsPublicApi) {
            return;
          }

          const { data } = await api.componentsPublicApi.getPublicPlans();

          dispatch({
            type: "DATA_FETCH_PUBLIC",
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
      500,
      { leading: true, trailing: false },
    );

    return fn();
  }, [api.componentsPublicApi]);

  const hydrate = useCallback(
    async (id: string, accessToken: string) => {
      const fn = debounce(
        async () => {
          dispatch({ type: "DATA_FETCH_STARTED" });

          try {
            if (!api.checkoutExternalApi) {
              return;
            }

            const response = await api.checkoutExternalApi.hydrateComponent(
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
              type: "DATA_FETCH_EMBED",
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
        500,
        { leading: true, trailing: false },
      );

      fn();
    },
    [api.checkoutExternalApi],
  );

  // TODO: api methods
  const getSetupIntent = useCallback(async () => {
    if (!id || !api.checkoutExternalApi) {
      return;
    }

    return state.checkoutExternalApi.getSetupIntent({
      componentId: id,
    });
  }, [id, state.checkoutExternalApi]);

  const updatePaymentMethod = useCallback(
    async (paymentMethodId: string) => {
      if (!state.checkoutExternalApi) {
        return;
      }

      return state.checkoutExternalApi.updatePaymentMethod({
        updatePaymentMethodRequestBody: {
          paymentMethodId,
        },
      });
    },
    [state.checkoutExternalApi],
  );

  const deletePaymentMethod = useCallback(
    async (checkoutId: string) => {
      if (!state.checkoutExternalApi) {
        return;
      }

      return state.checkoutExternalApi.deletePaymentMethod({ checkoutId });
    },
    [state.checkoutExternalApi],
  );

  const checkout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      if (!state.checkoutExternalApi) {
        return;
      }

      return state.checkoutExternalApi.checkout({
        changeSubscriptionRequestBody,
      });
    },
    [state.checkoutExternalApi],
  );

  const previewCheckout = useCallback(
    async (changeSubscriptionRequestBody: ChangeSubscriptionRequestBody) => {
      if (!state.checkoutExternalApi) {
        return;
      }

      return state.checkoutExternalApi.previewCheckout({
        changeSubscriptionRequestBody,
      });
    },
    [state.checkoutExternalApi],
  );

  const unsubscribe = useCallback(async () => {
    if (!state.checkoutExternalApi) {
      return;
    }

    return state.checkoutExternalApi.checkoutUnsubscribe();
  }, [state.checkoutExternalApi]);

  const listInvoices = useCallback(async () => {
    if (!state.checkoutExternalApi) {
      return;
    }

    return state.checkoutExternalApi.listInvoices();
  }, [state.checkoutExternalApi]);

  const initFontStylesheet = () => {
    const element = document.getElementById("schematic-fonts");
    if (element) {
      styleRef.current = element;
      return;
    }

    const style = document.createElement("link");
    style.id = "schematic-fonts";
    style.rel = "stylesheet";
    document.head.appendChild(style);
    styleRef.current = style;
  };

  useEffect(() => {
    initFontStylesheet();

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

  useEffect(() => {
    if (apiKey) {
      const configParams = { ...apiConfig, apiKey };
      merge(configParams.headers, {
        "X-Schematic-Components-Version":
          process.env.SCHEMATIC_COMPONENTS_VERSION || "unknown",
        "X-Schematic-Session-ID": sessionIdRef.current,
      });

      setApi((prev) => ({
        ...prev,
        checkoutExternalApi: new CheckoutexternalApi(
          new CheckoutConfiguration(configParams),
        ),
        componentsPublicApi: new ComponentspublicApi(
          new PublicConfiguration(configParams),
        ),
      }));
    }
  }, [apiKey, apiConfig]);

  return (
    <EmbedContext.Provider
      value={{
        data: state.data,
        error: state.error,
        getPublicPlans,
        hydrate,
        isPending: state.isPending,
      }}
    >
      {children}
    </EmbedContext.Provider>
  );
};
