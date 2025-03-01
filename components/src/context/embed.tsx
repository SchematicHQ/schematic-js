import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { initReactI18next } from "react-i18next";
import i18n from "i18next";
import { inflate } from "pako";
import { ThemeProvider } from "styled-components";
import merge from "lodash/merge";
import { v4 as uuidv4 } from "uuid";
import {
  CheckoutexternalApi,
  Configuration,
  type ConfigurationParameters,
  type ComponentHydrateResponseData,
} from "../api";
import en from "../locales/en.json";
import type {
  ComponentProps,
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
  danger: string;
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
  danger: "#D75A5C",
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
  badge?: {
    alignment: ComponentProps["$justifyContent"];
  };
};

export const defaultSettings: EmbedSettings = {
  theme: defaultTheme,
  badge: {
    alignment: "start",
  },
};

function isEditorState(obj: unknown): obj is SerializedEditorState {
  return (
    obj !== null &&
    typeof obj === "object" &&
    Object.entries(obj).every(([key, value]) => {
      return typeof key === "string" && typeof value === "object";
    })
  );
}

function getEditorState(json?: string) {
  if (json) {
    const obj = JSON.parse(json);
    if (isEditorState(obj)) {
      return obj;
    }
  }
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
      map[node.parent]?.children.push(nodeWithChildren);
    } else {
      arr.push(nodeWithChildren);
    }
  });

  return arr;
}

export type EmbedLayout =
  | "portal"
  | "checkout"
  | "payment"
  | "unsubscribe"
  | "disabled";

export type EmbedSelected = {
  period?: string;
  planId?: string | null;
  addOnId?: string | null;
  usage?: boolean;
};

export type EmbedMode = "edit" | "view";

export interface EmbedContextProps {
  api: CheckoutexternalApi | undefined;
  data: ComponentHydrateResponseData | undefined;
  nodes: SerializedNodeWithChildren[] | undefined;
  settings: EmbedSettings;
  layout: EmbedLayout;
  mode: EmbedMode;
  selected: EmbedSelected | undefined;
  isPending: boolean;
  error: Error | undefined;
  hydrate: () => Promise<void>;
  setData: (data: ComponentHydrateResponseData) => void;
  setLayout: (layout: EmbedLayout) => void;
  setSelected: (selected: EmbedSelected) => void;
  updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
}

export const EmbedContext = createContext<EmbedContextProps>({
  api: undefined,
  data: undefined,
  nodes: undefined,
  settings: { ...defaultSettings },
  layout: "portal",
  mode: "view",
  selected: undefined,
  isPending: false,
  error: undefined,
  hydrate: async () => {},
  setData: () => {},
  setLayout: () => {},
  setSelected: () => {},
  updateSettings: () => {},
});

export interface EmbedProviderProps {
  id?: string;
  accessToken?: string;
  apiConfig?: ConfigurationParameters;
  children?: React.ReactNode;
  mode?: EmbedMode;
}

export const EmbedProvider = ({
  id,
  accessToken,
  apiConfig,
  children,
  mode = "view",
}: EmbedProviderProps) => {
  const styleRef = useRef<HTMLLinkElement | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());

  const [state, setState] = useState<{
    api: CheckoutexternalApi | undefined;
    data: ComponentHydrateResponseData | undefined;
    nodes: SerializedNodeWithChildren[] | undefined;
    settings: EmbedSettings;
    layout: EmbedLayout;
    mode: EmbedMode;
    selected: EmbedSelected | undefined;
    isPending: boolean;
    error: Error | undefined;
    hydrate: () => Promise<void>;
    setData: (data: ComponentHydrateResponseData) => void;
    setLayout: (layout: EmbedLayout) => void;
    setSelected: (selected: EmbedSelected) => void;
    updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
  }>(() => {
    return {
      api: undefined,
      data: undefined,
      nodes: undefined,
      settings: { ...defaultSettings },
      layout: "portal",
      mode,
      selected: undefined,
      isPending: false,
      error: undefined,
      hydrate: async () => {},
      setData: () => {},
      setLayout: () => {},
      setSelected: () => {},
      updateSettings: () => {},
    };
  });

  const setData = (data: ComponentHydrateResponseData) => {
    setState((prev) => ({
      ...prev,
      data,
    }));
  };

  const updateSettings = (settings: RecursivePartial<EmbedSettings>) => {
    setState((prev) => {
      const updatedSettings = merge({}, prev.settings, { ...settings });
      return {
        ...prev,
        settings: updatedSettings,
      };
    });
  };

  const setLayout = (layout: EmbedLayout) => {
    setState((prev) => ({
      ...prev,
      layout,
    }));
  };

  const setSelected = (selected: RecursivePartial<EmbedSelected>) => {
    setState((prev) => ({
      ...prev,
      selected,
    }));
  };

  const hydrate = useCallback(async () => {
    if (id && state.api) {
      setState((prev) => ({ ...prev, isPending: true, error: undefined }));

      try {
        const nodes: SerializedNodeWithChildren[] = [];
        const settings: EmbedSettings = { ...defaultSettings };

        const response = await state.api.hydrateComponent({
          componentId: id,
        });
        const { data } = response;

        if (data.component?.ast) {
          const compressed = data.component.ast;
          const json = inflate(Uint8Array.from(Object.values(compressed)), {
            to: "string",
          }) as string | undefined; // `inflate` actually returns `string | undefined`
          const ast = getEditorState(json);
          if (ast) {
            merge(settings, ast.ROOT.props.settings);
            nodes.push(...parseEditorState(ast));
          }
        }

        setState((prev) => ({
          ...prev,
          data,
          nodes,
          settings,
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
    }
  }, [id, state.api]);

  useEffect(() => {
    i18n.use(initReactI18next).init({
      resources: {
        en,
      },
      lng: "en",
      fallbackLng: "en",
      interpolation: {
        escapeValue: false,
      },
    });

    const element = document.getElementById("schematic-fonts");
    if (element) {
      styleRef.current = element as HTMLLinkElement;
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
  }, [state.settings.theme.typography]);

  useEffect(() => {
    if (accessToken) {
      const { headers = {} } = apiConfig ?? {};
      headers["X-Schematic-Components-Version"] =
        process.env.SCHEMATIC_COMPONENTS_VERSION ?? "unknown";
      headers["X-Schematic-Session-ID"] = sessionIdRef.current;

      const api = new CheckoutexternalApi(
        new Configuration({
          ...apiConfig,
          apiKey: accessToken,
          headers,
        }),
      );

      setState((prev) => ({ ...prev, api }));
    }
  }, [apiConfig, accessToken]);

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <EmbedContext.Provider
      value={{
        api: state.api,
        data: state.data,
        nodes: state.nodes,
        settings: state.settings,
        layout: state.layout,
        mode: state.mode,
        selected: state.selected,
        isPending: state.isPending,
        error: state.error,
        hydrate,
        setData,
        setLayout,
        setSelected,
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
