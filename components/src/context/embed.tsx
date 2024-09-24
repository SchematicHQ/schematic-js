import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { inflate } from "pako";
import { ThemeProvider } from "styled-components";
import merge from "lodash.merge";
import { loadStripe, type Stripe } from "@stripe/stripe-js";
import { Elements } from "@stripe/react-stripe-js";
import {
  CheckoutApi,
  Configuration,
  type ConfigurationParameters,
  type ComponentHydrateResponseData,
} from "../api";
import type {
  RecursivePartial,
  SerializedEditorState,
  SerializedNodeWithChildren,
} from "../types";
import { GlobalStyle } from "./styles";

export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
}

export interface EmbedThemeSettings {
  numberOfColumns: 1 | 2 | 3;
  sectionLayout: "merged" | "separate";
  colorMode: "light" | "dark";
  primary: string;
  secondary: string;
  card: {
    background: string;
    borderRadius: number;
    hasShadow: boolean;
    padding: number;
  };
  typography: {
    heading1: TypographySettings;
    heading2: TypographySettings;
    heading3: TypographySettings;
    heading4: TypographySettings;
    heading5: TypographySettings;
    heading6: TypographySettings;
    text: TypographySettings;
    link: TypographySettings;
  };
}

export type FontStyle = keyof EmbedThemeSettings["typography"];

export const defaultTheme: EmbedThemeSettings = {
  numberOfColumns: 2,
  sectionLayout: "merged",
  colorMode: "light",
  primary: "#000000",
  secondary: "#194BFB",
  card: {
    background: "#FFFFFF",
    borderRadius: 10,
    hasShadow: true,
    padding: 45,
  },
  typography: {
    heading1: {
      fontFamily: "Manrope",
      fontSize: 37,
      fontWeight: 800,
      color: "#000000",
    },
    heading2: {
      fontFamily: "Manrope",
      fontSize: 29,
      fontWeight: 800,
      color: "#000000",
    },
    heading3: {
      fontFamily: "Manrope",
      fontSize: 20,
      fontWeight: 600,
      color: "#000000",
    },
    heading4: {
      fontFamily: "Manrope",
      fontSize: 18,
      fontWeight: 800,
      color: "#000000",
    },
    heading5: {
      fontFamily: "Public Sans",
      fontSize: 17,
      fontWeight: 500,
      color: "#000000",
    },
    heading6: {
      fontFamily: "Public Sans",
      fontSize: 14,
      fontWeight: 400,
      color: "#8A8A8A",
    },
    text: {
      fontFamily: "Public Sans",
      fontSize: 16,
      fontWeight: 400,
      color: "#000000",
    },
    link: {
      fontFamily: "Inter",
      fontSize: 16,
      fontWeight: 400,
      color: "#194BFB",
    },
  },
};

export type EmbedSettings = {
  theme: EmbedThemeSettings;
};

export const defaultSettings: EmbedSettings = {
  theme: defaultTheme,
};

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
function isEditorState(obj: any): obj is SerializedEditorState {
  return Object.entries(obj).every(([key, value]) => {
    return typeof key === "string" && typeof value === "object";
  });
}

function getEditorState(json: string) {
  const obj = JSON.parse(json);
  return isEditorState(obj) ? obj : undefined;
}

function parseEditorState(data: SerializedEditorState) {
  const initialMap: Record<string, SerializedNodeWithChildren> = {};
  const map = Object.entries(data).reduce((acc, [nodeId, node]) => {
    return { ...acc, [nodeId]: { ...node, id: nodeId, children: [] } };
  }, initialMap);

  const arr: SerializedNodeWithChildren[] = [];
  Object.entries(data).forEach(([nodeId, node]) => {
    const nodeWithChildren = map[nodeId];
    if (node.parent) {
      map[node.parent]?.children.push(nodeWithChildren!);
    } else {
      arr.push(nodeWithChildren!);
    }
  });

  return arr;
}

export type EmbedLayout =
  | "portal"
  | "checkout"
  | "payment"
  | "success"
  | "disabled";

export interface EmbedContextProps {
  api: CheckoutApi | null;
  data: ComponentHydrateResponseData;
  nodes: SerializedNodeWithChildren[];
  settings: EmbedSettings;
  stripe: Promise<Stripe | null> | null;
  layout: EmbedLayout;
  error?: Error;
  isPending: boolean;
  hydrate: () => void;
  setData: (data: RecursivePartial<ComponentHydrateResponseData>) => void;
  updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
  setStripe: (stripe: Promise<Stripe | null> | null) => void;
  setLayout: (layout: EmbedLayout) => void;
}

export const EmbedContext = createContext<EmbedContextProps>({
  api: null,
  data: {
    activePlans: [],
  },
  nodes: [],
  settings: { ...defaultSettings },
  stripe: null,
  layout: "portal",
  error: undefined,
  isPending: false,
  hydrate: () => {},
  setData: () => {},
  updateSettings: () => {},
  setStripe: () => {},
  setLayout: () => {},
});

export interface EmbedProviderProps {
  id?: string;
  accessToken?: string;
  apiConfig?: ConfigurationParameters;
  children?: React.ReactNode;
}

export const EmbedProvider = ({
  id,
  accessToken,
  apiConfig,
  children,
}: EmbedProviderProps) => {
  const styleRef = useRef<HTMLLinkElement | null>(null);

  const [state, setState] = useState<{
    api: CheckoutApi | null;
    data: ComponentHydrateResponseData;
    nodes: SerializedNodeWithChildren[];
    settings: EmbedSettings;
    stripe: Promise<Stripe | null> | null;
    layout: EmbedLayout;
    isPending: boolean;
    error: Error | undefined;
    hydrate: () => void;
    setData: (data: RecursivePartial<ComponentHydrateResponseData>) => void;
    updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
    setStripe: (stripe: Promise<Stripe | null> | null) => void;
    setLayout: (layout: EmbedLayout) => void;
  }>(() => {
    return {
      api: null,
      data: {
        activePlans: [],
      },
      nodes: [],
      settings: { ...defaultSettings },
      stripe: null,
      layout: "portal",
      isPending: false,
      error: undefined,
      hydrate: () => {},
      setData: () => {},
      updateSettings: () => {},
      setStripe: () => {},
      setLayout: () => {},
    };
  });

  const hydrate = useCallback(async () => {
    setState((prev) => ({ ...prev, isPending: true, error: undefined }));

    try {
      const nodes: SerializedNodeWithChildren[] = [];
      const settings: EmbedSettings = { ...defaultSettings };

      if (!id || !state.api) {
        return new Error("Invalid component id or api instance.");
      }

      const response = await state.api.hydrateComponent({ componentId: id });
      const { data } = response;

      if (data.component?.ast) {
        const compressed = data.component.ast;
        const json = inflate(Uint8Array.from(Object.values(compressed)), {
          to: "string",
        });
        const ast = getEditorState(json);
        if (ast) {
          merge(settings, ast.ROOT.props.settings);
          nodes.push(...parseEditorState(ast));
        }
      }

      let stripe: Promise<Stripe | null> | null = null;
      if (data.stripeEmbed?.publishableKey) {
        stripe = loadStripe(data.stripeEmbed.publishableKey);
      }

      setState((prev) => ({
        ...prev,
        data,
        nodes,
        settings,
        stripe,
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
  }, [id, state.api]);

  const setData = useCallback(
    (data: RecursivePartial<ComponentHydrateResponseData>) => {
      setState((prev) => {
        const updatedData = merge({}, prev.data, { ...data });
        return {
          ...prev,
          data: updatedData,
        };
      });
    },
    [setState],
  );

  const updateSettings = useCallback(
    (settings: RecursivePartial<EmbedSettings>) => {
      setState((prev) => {
        const updatedSettings = merge({}, prev.settings, { ...settings });
        return {
          ...prev,
          settings: updatedSettings,
        };
      });
    },
    [setState],
  );

  const setStripe = useCallback(
    (stripe: Promise<Stripe | null> | null) => {
      setState((prev) => ({
        ...prev,
        stripe,
      }));
    },
    [setState],
  );

  const setLayout = useCallback(
    (layout: EmbedLayout) => {
      setState((prev) => ({
        ...prev,
        layout,
      }));
    },
    [setState],
  );

  useEffect(() => {
    const element = document.getElementById("schematic-fonts");
    if (element) {
      return void (styleRef.current = element as HTMLLinkElement);
    }

    const style = document.createElement("link");
    style.id = "schematic-fonts";
    style.rel = "stylesheet";
    document.head.appendChild(style);
    styleRef.current = style;
  }, []);

  useEffect(() => {
    if (!accessToken) {
      return;
    }

    const config = new Configuration({ ...apiConfig, apiKey: accessToken });
    const api = new CheckoutApi(config);
    setState((prev) => ({ ...prev, api }));
  }, [accessToken, apiConfig]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  useEffect(() => {
    const fontSet = new Set<string>([]);
    Object.values(state.settings.theme.typography).forEach(({ fontFamily }) => {
      fontSet.add(fontFamily);
    });

    if (fontSet.size > 0) {
      const src = `https://fonts.googleapis.com/css2?${[...fontSet]
        .map((fontFamily) => `family=${fontFamily}&display=swap`)
        .join("&")}`;
      if (styleRef.current) {
        styleRef.current.href = src;
      }
    }
  }, [state.settings.theme.typography]);

  const renderChildren = () => {
    if (state.stripe) {
      return (
        <Elements
          stripe={state.stripe}
          options={{
            appearance: {
              theme: "stripe",
              variables: {
                // Base
                fontFamily: '"Public Sans", system-ui, sans-serif',
                spacingUnit: "0.25rem",
                borderRadius: "0.5rem",
                colorText: "#30313D",
                colorBackground: "#FFFFFF",
                colorPrimary: "#0570DE",
                colorDanger: "#DF1B41",

                // Layout
                gridRowSpacing: "1.5rem",
                gridColumnSpacing: "1.5rem",
              },
              rules: {
                ".Label": {
                  fontSize: "1rem",
                  fontWeight: "400",
                  marginBottom: "0.75rem",
                  color: state.settings.theme.typography.text.color,
                },
              },
            },
            ...(state.data.stripeEmbed?.setupIntentClientSecret
              ? {
                  clientSecret: state.data.stripeEmbed?.setupIntentClientSecret,
                }
              : { mode: "payment", currency: "usd", amount: 999999 }),
          }}
        >
          {children}
        </Elements>
      );
    }

    return children;
  };

  return (
    <EmbedContext.Provider
      value={{
        api: state.api,
        data: state.data,
        nodes: state.nodes,
        settings: state.settings,
        stripe: state.stripe,
        layout: state.layout,
        error: state.error,
        isPending: state.isPending,
        hydrate,
        setData,
        updateSettings,
        setStripe,
        setLayout,
      }}
    >
      <ThemeProvider theme={state.settings.theme}>
        <GlobalStyle />
        {renderChildren()}
      </ThemeProvider>
    </EmbedContext.Provider>
  );
};