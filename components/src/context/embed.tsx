import "../localization";

import merge from "lodash/merge";
import { inflate } from "pako";
import { createContext, useCallback, useEffect, useRef, useState } from "react";
import { ThemeProvider } from "styled-components";
import { v4 as uuidv4 } from "uuid";

import {
  type ChangeSubscriptionRequestBody,
  CheckoutexternalApi,
  type CheckoutResponse,
  type CheckoutUnsubscribeResponse,
  type ComponentHydrateResponseData,
  Configuration,
  type ConfigurationParameters,
  type DeletePaymentMethodResponse,
  type GetSetupIntentResponse,
  type ListInvoicesResponse,
  type PreviewCheckoutResponse,
  type UpdatePaymentMethodResponse,
} from "../api/checkoutexternal";
import {
  ComponentspublicApi,
  Configuration as PublicConfiguration,
  type PublicPlansResponseData,
} from "../api/componentspublic";
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
    visibility?: ComponentProps["$visibility"];
  };
};

export const defaultSettings: EmbedSettings = {
  theme: { ...defaultTheme },
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

// TODO: find a better way to map types
function mapPublicDataToHydratedData(
  data: PublicPlansResponseData,
): Partial<ComponentHydrateResponseData> {
  return {
    activePlans: data.activePlans.map((plan) => ({
      ...plan,
      active: false,
      companyCanTrial: false,
      current: false,
      valid: true,
    })),
    activeAddOns: data.activeAddOns.map((addOn) => ({
      ...addOn,
      active: false,
      companyCanTrial: false,
      current: false,
      valid: true,
    })),
    capabilities: {
      badgeVisibility: data.capabilities?.badgeVisibility ?? false,
      checkout: true,
    },
  };
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

export type EmbedMode = "edit" | "view" | "standalone";

export interface EmbedContextProps {
  data: Partial<ComponentHydrateResponseData>;
  nodes: SerializedNodeWithChildren[];
  settings: EmbedSettings;
  layout: EmbedLayout;
  mode: EmbedMode;
  selected: EmbedSelected;
  error?: Error;
  isPending: boolean;
  setIsPending: (bool: boolean) => void;
  setData: (data: Partial<ComponentHydrateResponseData>) => void;
  setLayout: (layout: EmbedLayout) => void;
  setSelected: (selected: EmbedSelected) => void;
  updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
  getPublicData: () => Promise<void>;
  hydrate: () => Promise<void>;
  getSetupIntent: () => Promise<GetSetupIntentResponse | void>;
  updatePaymentMethod: (
    paymentMethodId: string,
  ) => Promise<UpdatePaymentMethodResponse | void>;
  deletePaymentMethod: (
    checkoutId: string,
  ) => Promise<DeletePaymentMethodResponse | void>;
  checkout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
  ) => Promise<CheckoutResponse | void>;
  previewCheckout: (
    changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
  ) => Promise<PreviewCheckoutResponse | void>;
  unsubscribe: () => Promise<CheckoutUnsubscribeResponse | void>;
  listInvoices: () => Promise<ListInvoicesResponse | void>;
}

export const EmbedContext = createContext<EmbedContextProps>({
  data: {},
  nodes: [],
  settings: { ...defaultSettings },
  layout: "portal",
  mode: "standalone",
  selected: {},
  error: undefined,
  isPending: false,
  setIsPending: () => {},
  setData: () => {},
  setLayout: () => {},
  setSelected: () => {},
  updateSettings: () => {},
  getPublicData: async () => {},
  hydrate: async () => {},
  getSetupIntent: async () => {},
  updatePaymentMethod: async () => {},
  deletePaymentMethod: async () => {},
  checkout: async () => {},
  previewCheckout: async () => {},
  unsubscribe: async () => {},
  listInvoices: async () => {},
});

export interface EmbedProviderProps {
  accessToken?: string;
  apiKey?: string;
  apiConfig?: ConfigurationParameters;
  id?: string;
  settings?: RecursivePartial<EmbedSettings>;
  mode?: EmbedMode;
  debug?: boolean;
  children?: React.ReactNode;
}

export const EmbedProvider = ({
  accessToken,
  apiKey,
  apiConfig,
  id,
  children,
  ...options
}: EmbedProviderProps) => {
  const styleRef = useRef<HTMLLinkElement | null>(null);
  const sessionIdRef = useRef<string>(uuidv4());

  const [state, setState] = useState<{
    checkoutExternalApi: CheckoutexternalApi | null;
    componentsPublicApi: ComponentspublicApi | null;
    data: Partial<ComponentHydrateResponseData>;
    nodes: SerializedNodeWithChildren[];
    settings: EmbedSettings;
    layout: EmbedLayout;
    mode: EmbedMode;
    selected: EmbedSelected;
    isPending: boolean;
    error?: Error;
    setIsPending: (bool: boolean) => void;
    setData: (data: Partial<ComponentHydrateResponseData>) => void;
    setLayout: (layout: EmbedLayout) => void;
    setSelected: (selected: EmbedSelected) => void;
    updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
    getPublicData: () => Promise<void>;
    hydrate: () => Promise<void>;
    getSetupIntent: () => Promise<GetSetupIntentResponse | void>;
    updatePaymentMethod: (
      paymentMethodId: string,
    ) => Promise<UpdatePaymentMethodResponse | void>;
    deletePaymentMethod: (
      checkoutId: string,
    ) => Promise<DeletePaymentMethodResponse | void>;
    checkout: (
      changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
    ) => Promise<CheckoutResponse | void>;
    previewCheckout: (
      changeSubscriptionRequestBody: ChangeSubscriptionRequestBody,
    ) => Promise<PreviewCheckoutResponse | void>;
    unsubscribe: () => Promise<CheckoutUnsubscribeResponse | void>;
    listInvoices: () => Promise<ListInvoicesResponse | void>;
  }>(() => {
    const settings = merge({}, defaultSettings, options.settings);

    return {
      checkoutExternalApi: null,
      componentsPublicApi: null,
      data: {},
      nodes: [],
      settings,
      layout: "portal",
      mode: options.mode || "standalone",
      selected: {},
      isPending: false,
      error: undefined,
      setData: () => {},
      setIsPending: () => {},
      setLayout: () => {},
      setSelected: () => {},
      updateSettings: () => {},
      getPublicData: async () => {},
      hydrate: async () => {},
      getSetupIntent: async () => {},
      updatePaymentMethod: async () => {},
      deletePaymentMethod: async () => {},
      checkout: async () => {},
      previewCheckout: async () => {},
      unsubscribe: async () => {},
      listInvoices: async () => {},
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

  const hydrate = useCallback(async () => {
    setState((prev) => ({ ...prev, isPending: true, error: undefined }));

    try {
      const nodes: SerializedNodeWithChildren[] = [];
      const settings: EmbedSettings = { ...defaultSettings };

      if (!id || !state.checkoutExternalApi) {
        return;
      }

      const response = await state.checkoutExternalApi.hydrateComponent({
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
  }, [id, state.checkoutExternalApi]);

  // shared api methods
  const getSetupIntent = useCallback(async () => {
    if (!id || !state.checkoutExternalApi) {
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

  const setIsPending = (bool: boolean) => {
    setState((prev) => ({
      ...prev,
      isPending: bool,
    }));
  };

  const setData = (data: Partial<ComponentHydrateResponseData>) => {
    setState((prev) => ({
      ...prev,
      data,
    }));
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

  const updateSettings = (settings: RecursivePartial<EmbedSettings>) => {
    setState((prev) => {
      const updatedSettings = merge({}, prev.settings, { ...settings });
      return {
        ...prev,
        settings: updatedSettings,
      };
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
      const checkoutExternalApi = new CheckoutexternalApi(config);
      setState((prev) => ({ ...prev, checkoutExternalApi }));
    }
  }, [accessToken, apiConfig]);

  useEffect(() => {
    if (apiKey) {
      const { headers = {} } = apiConfig ?? {};
      headers["X-Schematic-Components-Version"] =
        process.env.SCHEMATIC_COMPONENTS_VERSION ?? "unknown";
      headers["X-Schematic-Session-ID"] = sessionIdRef.current;

      const config = new PublicConfiguration({
        ...apiConfig,
        apiKey,
        headers,
      });
      const componentsPublicApi = new ComponentspublicApi(config);
      setState((prev) => ({ ...prev, componentsPublicApi }));
    }
  }, [apiKey, apiConfig]);

  useEffect(() => {
    getPublicData();
  }, [getPublicData]);

  useEffect(() => {
    if (options.mode === "standalone") {
      return;
    }

    hydrate();
  }, [options.mode, hydrate]);

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
    <EmbedContext.Provider
      value={{
        data: state.data,
        nodes: state.nodes,
        settings: state.settings,
        layout: state.layout,
        mode: state.mode,
        selected: state.selected,
        error: state.error,
        isPending: state.isPending,
        setIsPending,
        setData,
        setLayout,
        setSelected,
        updateSettings,
        getPublicData,
        hydrate,
        getSetupIntent,
        updatePaymentMethod,
        deletePaymentMethod,
        checkout,
        previewCheckout,
        unsubscribe,
        listInvoices,
      }}
    >
      <ThemeProvider theme={state.settings.theme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
    </EmbedContext.Provider>
  );
};
