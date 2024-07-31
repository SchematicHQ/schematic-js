import { createContext, useCallback, useEffect, useState } from "react";
import { inflate } from "pako";
import { ThemeProvider } from "styled-components";
import {
  ComponentsApi,
  Configuration,
  type ComponentHydrateResponseData,
} from "../api";
import { light, dark } from "../components/theme";
import type {
  RecursivePartial,
  CompressedEditorState,
  SerializedEditorState,
  SerializedNodeWithChildren,
  Settings,
} from "../types";

const defaultSettings: Settings = {
  theme: "light",
  sectionLayout: "merged",
  borderWidth: 0,
  borderColor: "#E9E9E9",
  borderRadius: 10,
  boxShadow: "none",
  boxPadding: 50,
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
  const settings = { ...defaultSettings };
  const nodes: SerializedNodeWithChildren[] = [];
  const config = new Configuration({ apiKey: accessToken });
  const api = new ComponentsApi(config);
  const response = await api.hydrateComponent({ componentId: id });
  const { data } = response;

  if (data.component?.ast) {
    // ast from response is actually an object with keys as numbers
    const compressed = data.component.ast as CompressedEditorState;
    const json = inflate(Uint8Array.from(Object.values(compressed)), {
      to: "string",
    });
    const ast = getEditorState(json);
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

type SetData = (data: RecursivePartial<ComponentHydrateResponseData>) => void;
type SetSettings = (settings: RecursivePartial<Settings>) => void;

export interface EmbedContextProps {
  data: RecursivePartial<ComponentHydrateResponseData>;
  nodes: SerializedNodeWithChildren[];
  settings: RecursivePartial<Settings>;
  error?: Error;
  setData: SetData;
  setSettings: SetSettings;
  updateSettings: SetSettings;
}

export const EmbedContext = createContext<EmbedContextProps>({
  data: {},
  nodes: [],
  settings: {},
  setData: () => {},
  setSettings: () => {},
  updateSettings: () => {},
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
  const [state, setState] = useState<EmbedContextProps>({
    data: {},
    nodes: [],
    settings: { ...defaultSettings },
    setData: () => {},
    setSettings: () => {},
    updateSettings: () => {},
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
        data,
      }));
    },
    [setState],
  );

  const setSettings = useCallback(
    (settings: RecursivePartial<Settings>) => {
      setState((prev) => ({
        ...prev,
        settings,
      }));
    },
    [setState],
  );

  const updateSettings = useCallback(
    (settings: RecursivePartial<Settings>) => {
      setState((prev) => ({
        ...prev,
        settings: { ...prev.settings, ...settings },
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
        error: state.error,
        setData,
        setSettings,
        updateSettings,
      }}
    >
      <ThemeProvider theme={state.settings.theme === "dark" ? dark : light}>
        {children}
      </ThemeProvider>
    </EmbedContext.Provider>
  );
};
