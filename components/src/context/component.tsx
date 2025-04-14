import i18n from "i18next";
import { merge } from "lodash";
import { inflate } from "pako";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { initReactI18next } from "react-i18next";
import { ThemeProvider } from "styled-components";
import { v4 as uuidv4 } from "uuid";

import {
  CheckoutexternalApi,
  type ComponentHydrateResponseData,
  Configuration,
  type ConfigurationParameters,
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

export interface ComponentThemeSettings {
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

export type FontStyle = keyof ComponentThemeSettings["typography"];

export const defaultTheme: ComponentThemeSettings = {
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

export type ComponentSettings = {
  theme: ComponentThemeSettings;
  badge?: {
    alignment: ComponentProps["$justifyContent"];
    visibility?: ComponentProps["$visibility"];
  };
};

export const defaultSettings: ComponentSettings = {
  theme: defaultTheme,
  badge: {
    alignment: "start",
    visibility: "visible",
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

export type ComponentLayout =
  | "portal"
  | "checkout"
  | "payment"
  | "unsubscribe"
  | "disabled";

export type ComponentSelected = {
  period?: string;
  planId?: string | null;
  addOnId?: string | null;
  usage?: boolean;
};

export type ComponentMode = "edit" | "view";

export interface ComponentContextProps {
  api: CheckoutexternalApi | null;
  data: ComponentHydrateResponseData;
  nodes: SerializedNodeWithChildren[];
  settings: ComponentSettings;
  layout: ComponentLayout;
  mode: ComponentMode;
  selected: ComponentSelected;
  error?: Error;
  isPending: boolean;
  hydrate: () => Promise<void>;
  setIsPending: (bool: boolean) => void;
  setData: (data: ComponentHydrateResponseData) => void;
  setLayout: (layout: ComponentLayout) => void;
  setSelected: (selected: ComponentSelected) => void;
  updateSettings: (settings: RecursivePartial<ComponentSettings>) => void;
}

export const ComponentContext = createContext<ComponentContextProps>({
  api: null,
  data: {
    activeAddOns: [],
    activePlans: [],
    activeUsageBasedEntitlements: [],
  },
  nodes: [],
  settings: { ...defaultSettings },
  layout: "portal",
  mode: "view",
  selected: {},
  error: undefined,
  isPending: false,
  hydrate: async () => {},
  setIsPending: () => {},
  setData: () => {},
  setLayout: () => {},
  setSelected: () => {},
  updateSettings: () => {},
});

export interface ComponentProviderProps {
  id?: string;
  accessToken?: string;
  apiConfig?: ConfigurationParameters;
  children?: React.ReactNode;
  mode?: ComponentMode;
  debug?: boolean;
}

export const ComponentProvider = ({
  id,
  accessToken,
  apiConfig,
  children,
  mode = "view",
  ...options
}: ComponentProviderProps) => {
  const styleRef = useRef<HTMLLinkElement | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());

  const [state, setState] = useState<{
    api: CheckoutexternalApi | null;
    data: ComponentHydrateResponseData;
    nodes: SerializedNodeWithChildren[];
    settings: ComponentSettings;
    layout: ComponentLayout;
    mode: ComponentMode;
    selected: ComponentSelected;
    isPending: boolean;
    error?: Error;
    hydrate: () => Promise<void>;
    setIsPending: (bool: boolean) => void;
    setData: (data: ComponentHydrateResponseData) => void;
    setLayout: (layout: ComponentLayout) => void;
    setSelected: (selected: ComponentSelected) => void;
    updateSettings: (settings: RecursivePartial<ComponentSettings>) => void;
  }>(() => {
    return {
      api: null,
      data: {
        activeAddOns: [],
        activePlans: [],
        activeUsageBasedEntitlements: [],
      },
      nodes: [],
      settings: { ...defaultSettings },
      layout: "portal",
      mode,
      selected: {},
      isPending: false,
      error: undefined,
      hydrate: async () => {},
      setData: () => {},
      setIsPending: () => {},
      setLayout: () => {},
      setSelected: () => {},
      updateSettings: () => {},
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

  const hydrate = useCallback(async () => {
    setState((prev) => ({ ...prev, isPending: true, error: undefined }));

    try {
      const nodes: SerializedNodeWithChildren[] = [];
      const settings: ComponentSettings = { ...defaultSettings };

      if (!id || !state.api) {
        return;
      }

      const response = await state.api.hydrateComponent({ componentId: id });
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
  }, [id, state.api]);

  const setIsPending = (bool: boolean) => {
    setState((prev) => ({
      ...prev,
      isPending: bool,
    }));
  };

  const setData = (data: ComponentHydrateResponseData) => {
    setState((prev) => ({
      ...prev,
      data,
    }));
  };

  const setLayout = (layout: ComponentLayout) => {
    setState((prev) => ({
      ...prev,
      layout,
    }));
  };

  const setSelected = (selected: RecursivePartial<ComponentSelected>) => {
    setState((prev) => ({
      ...prev,
      selected,
    }));
  };

  const updateSettings = (settings: RecursivePartial<ComponentSettings>) => {
    setState((prev) => {
      const updatedSettings = merge({}, prev.settings, { ...settings });
      return {
        ...prev,
        settings: updatedSettings,
      };
    });
  };

  const initI18n = () => {
    /* eslint-disable-next-line import/no-named-as-default-member */
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
  };

  const initFontStylesheet = () => {
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
  };

  useEffect(() => {
    initI18n();
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
    if (accessToken) {
      const { headers = {} } = apiConfig ?? {};
      headers["X-Schematic-Components-Version"] =
        process.env.SCHEMATIC_COMPONENTS_VERSION ?? "unknown";
      headers["X-Schematic-Session-ID"] = sessionIdRef.current;

      const config = new Configuration({
        ...apiConfig,
        apiKey: accessToken,
        headers,
      });
      const api = new CheckoutexternalApi(config);
      setState((prev) => ({ ...prev, api }));
    }
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

  return (
    <ComponentContext.Provider
      value={{
        api: state.api,
        data: state.data,
        nodes: state.nodes,
        settings: state.settings,
        layout: state.layout,
        mode: state.mode,
        selected: state.selected,
        error: state.error,
        isPending: state.isPending,
        hydrate,
        setIsPending,
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
    </ComponentContext.Provider>
  );
};
