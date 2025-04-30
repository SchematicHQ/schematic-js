import merge from "lodash/merge";
import { inflate } from "pako";
import { useCallback, useEffect, useState } from "react";
import { ThemeProvider } from "styled-components";

import {
  type ChangeSubscriptionRequestBody,
  CheckoutexternalApi,
  type CheckoutResponse,
  type CheckoutUnsubscribeResponse,
  Configuration,
  type DeletePaymentMethodResponse,
  type GetSetupIntentResponse,
  type ListInvoicesResponse,
  type PreviewCheckoutResponse,
  type UpdatePaymentMethodResponse,
} from "../../api/checkoutexternal";
import { useEmbed } from "../../hooks";
import type {
  ComponentProps,
  RecursivePartial,
  SerializedEditorState,
  SerializedNodeWithChildren,
} from "../../types";
import { ComponentTree } from "./ComponentTree";
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

export interface EmbedProps {
  id?: string;
  accessToken?: string;
  // TODO: clean-up
  nodes: SerializedNodeWithChildren[];
  settings: EmbedSettings;
  updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
  layout: EmbedLayout;
  setLayout: (layout: EmbedLayout) => void;
  mode: EmbedMode;
  selected: EmbedSelected;
  setSelected: (selected: EmbedSelected) => void;
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

export const SchematicEmbed = ({ id, accessToken }: EmbedProps) => {
  const [state, setState] = useState<{
    nodes: SerializedNodeWithChildren[];
    settings: EmbedSettings;
  }>({
    nodes: [],
    settings: { ...defaultSettings },
  });
  const [error, setError] = useState<Error>();

  const { data, hydrateComponent } = useEmbed();

  const hydrate = useCallback(async () => {
    if (!id || !accessToken) {
      return;
    }

    await hydrateComponent(id, accessToken);
  }, [id, accessToken, hydrateComponent]);

  useEffect(() => {
    try {
      if (data.component?.ast) {
        const nodes: SerializedNodeWithChildren[] = [];
        const settings: EmbedSettings = { ...defaultSettings };
        const compressed = data.component.ast;
        const json = inflate(Uint8Array.from(Object.values(compressed)), {
          to: "string",
        }) as string | undefined; // `inflate` actually returns `string | undefined`
        const ast = getEditorState(json);
        if (ast) {
          merge(settings, ast.ROOT.props.settings);
          nodes.push(...parseEditorState(ast));
          setState(() => ({ nodes, settings }));
        }
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error
          : new Error("An unknown error occurred."),
      );
    }
  }, [data.component?.ast]);

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

  if (accessToken?.length === 0) {
    return <div>Please provide an access token.</div>;
  }

  if (!accessToken?.startsWith("token_")) {
    return (
      <div>
        Invalid access token; your temporary access token will start with
        "token_".
      </div>
    );
  }

  return (
    <ThemeProvider theme={state.settings.theme}>
      <GlobalStyle />
      <ComponentTree nodes={state.nodes} />
    </ThemeProvider>
  );
};
