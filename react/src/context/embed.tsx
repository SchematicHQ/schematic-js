import { createContext, useCallback, useEffect, useState } from "react";
// import { inflate } from "pako";
import { ThemeProvider } from "styled-components";
import {
  ComponentsApi,
  Configuration,
  type ComponentHydrateResponseData,
} from "../api";
import type { EmbedThemeSettings } from "../styled";
import type {
  RecursivePartial,
  // CompressedEditorState,
  SerializedEditorState,
  SerializedNodeWithChildren,
  EmbedSettings,
  EmbedLayout,
} from "../types";

import testAst from "../assets/json/test-data-ast.json";

export const defaultTheme: EmbedThemeSettings = {
  numberOfColumns: 2,
  sectionLayout: "merged",
  colorMode: "light",
  primary: "#194BFB",
  secondary: "#000000",
  card: {
    background: "#FFFFFF",
    borderRadius: 10,
    hasShadow: true,
    padding: 50,
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
      fontSize: 24,
      fontWeight: 700,
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
      fontWeight: 500,
      color: "#000000",
    },
    heading5: {
      fontFamily: "Manrope",
      fontSize: 16,
      fontWeight: 500,
      color: "#000000",
    },
    heading6: {
      fontFamily: "Manrope",
      fontSize: 14,
      fontWeight: 400,
      color: "#000000",
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

export const defaultSettings: EmbedSettings = {
  theme: defaultTheme,
  // borderWidth: 1,
  // borderColor: "#E9E9E9",
  // borderRadius: 10,
  // boxShadow: "none",
  // padding: 50,
  // design: {
  //   typography: {
  //     heading1: {
  //       fontSize: 5,
  //     },
  //     heading2: {
  //       fontSize: 20,
  //     },
  //   },
  // },
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

async function fetchComponent(id: string, accessToken: string) {
  const settings: EmbedSettings = { ...defaultSettings };
  const nodes: SerializedNodeWithChildren[] = [];
  const config = new Configuration({ apiKey: accessToken });
  const api = new ComponentsApi(config);
  const response = await api.hydrateComponent({ componentId: id });
  const { data } = response;

  if (data.component?.ast) {
    // ast from response is actually an object with keys as numbers
    /* const compressed = data.component.ast as CompressedEditorState;
    const json = inflate(Uint8Array.from(Object.values(compressed)), {
      to: "string",
    }); */
    const ast = getEditorState(JSON.stringify(testAst));
    if (ast) {
      Object.assign(settings, ast.ROOT.props);
      nodes.push(...parseEditorState(ast));
    }
  }

  return {
    data,
    nodes,
    settings,
  };
}

export interface EmbedContextProps {
  data: RecursivePartial<ComponentHydrateResponseData>;
  nodes: SerializedNodeWithChildren[];
  settings: EmbedSettings;
  layout: EmbedLayout;
  error?: Error;
  setData: (data: RecursivePartial<ComponentHydrateResponseData>) => void;
  updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
  setLayout: (layout: EmbedLayout) => void;
}

export const EmbedContext = createContext<EmbedContextProps>({
  data: {},
  nodes: [],
  settings: { ...defaultSettings },
  layout: "portal",
  error: undefined,
  setData: () => {},
  updateSettings: () => {},
  setLayout: () => {},
});

export interface EmbedProviderProps {
  id?: string;
  accessToken?: string;
  children?: React.ReactNode;
}

export const EmbedProvider = ({
  id,
  accessToken,
  children,
}: EmbedProviderProps) => {
  const [state, setState] = useState(() => {
    return {
      data: {} as RecursivePartial<ComponentHydrateResponseData>,
      nodes: [] as SerializedNodeWithChildren[],
      settings: { ...defaultSettings } as EmbedSettings,
      layout: "portal" as EmbedLayout,
      error: undefined,
      setData: () => {},
      updateSettings: () => {},
      setLayout: () => {},
    };
  });

  useEffect(() => {
    if (!id || !accessToken) {
      return;
    }

    fetchComponent(id, accessToken)
      .then((resolvedData) => {
        setState((prev) => ({ ...prev, ...resolvedData }));
      })
      .catch((error) => setState((prev) => ({ ...prev, error })));
  }, [id, accessToken]);

  const setData = useCallback(
    (data: RecursivePartial<ComponentHydrateResponseData>) => {
      setState((prev) => ({
        ...prev,
        data: Object.assign({}, data),
      }));
    },
    [setState],
  );

  const updateSettings = useCallback(
    (settings: RecursivePartial<EmbedSettings>) => {
      setState((prev) => ({
        ...prev,
        settings: Object.assign({}, prev.settings, settings),
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

  return (
    <EmbedContext.Provider
      value={{
        data: state.data,
        nodes: state.nodes,
        settings: state.settings,
        layout: state.layout,
        error: state.error,
        setData,
        updateSettings,
        setLayout,
      }}
    >
      <ThemeProvider theme={state.settings.theme}>{children}</ThemeProvider>
    </EmbedContext.Provider>
  );
};
