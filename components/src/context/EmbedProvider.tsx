import "../localization";

import { merge } from "lodash";
import { useCallback, useEffect, useRef, useState } from "react";
import { v4 as uuidv4 } from "uuid";

import {
  CheckoutexternalApi,
  type ComponentHydrateResponseData,
  Configuration as CheckoutConfiguration,
  type ConfigurationParameters,
} from "../api/checkoutexternal";
import {
  ComponentspublicApi,
  Configuration as PublicConfiguration,
} from "../api/componentspublic";
import { EmbedContext } from "./EmbedContext";
import { mapPublicDataToHydratedData } from "./utils";

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

  const [state, setState] = useState<{
    checkoutExternalApi: CheckoutexternalApi | null;
    componentsPublicApi: ComponentspublicApi | null;
    error?: Error;
    data: Partial<ComponentHydrateResponseData>;
    setData: (data: Partial<ComponentHydrateResponseData>) => void;
    isPending: boolean;
    setIsPending: (bool: boolean) => void;
    getPublicData: () => Promise<void>;
    hydrateComponent: (id: string, accessToken: string) => Promise<void>;
  }>(() => {
    return {
      checkoutExternalApi: null,
      componentsPublicApi: null,
      error: undefined,
      data: {},
      setData: () => {},
      isPending: false,
      setIsPending: () => {},
      getPublicData: async () => {},
      hydrateComponent: async () => {},
    };
  });

  const debug = useCallback(
    (message: string, ...args: unknown[]) => {
      if (options.debug) {
        console.debug(`[Schematic] ${message}`, ...args);
      }
    },
    [options.debug],
  );

  const getPublicData = useCallback(async () => {
    setState((prev) => ({ ...prev, isPending: true, error: undefined }));

    try {
      if (!state.componentsPublicApi) {
        return;
      }

      const { data } = await state.componentsPublicApi.getPublicPlans();

      setState((prev) => ({
        ...prev,
        data: mapPublicDataToHydratedData(data),
        isPending: false,
      }));
    } catch (error) {
      setState((prev) => ({
        ...prev,
        isPending: false,
        error:
          error instanceof Error
            ? error
            : new Error("An unknown error occurred."),
      }));
    }
  }, [state.componentsPublicApi]);

  const hydrateEmbed = useCallback(
    async (id: string, accessToken: string) => {
      setState((prev) => ({ ...prev, isPending: true, error: undefined }));

      try {
        if (!state.checkoutExternalApi) {
          return;
        }

        const response = await state.checkoutExternalApi.hydrateComponent(
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

        setState((prev) => ({
          ...prev,
          data,
          isPending: false,
        }));
      } catch (error) {
        setState((prev) => ({
          ...prev,
          isPending: false,
          error:
            error instanceof Error
              ? error
              : new Error("An unknown error occurred."),
        }));
      }
    },
    [state.checkoutExternalApi],
  );

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

      setState((prev) => ({
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
        getPublicData,
        hydrateEmbed,
        isPending: state.isPending,
      }}
    >
      {children}
    </EmbedContext.Provider>
  );
};
