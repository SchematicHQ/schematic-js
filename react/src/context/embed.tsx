import { createContext, useEffect, useState } from "react";
import { inflate } from "pako";
import {
  ComponentsApi,
  Configuration,
  type ComponentHydrateResponseData,
} from "../api";
import type {
  ComponentTree,
  CompressedEditorState,
  SerializedEditorState,
  SerializedNode,
  SerializedNodeWithChildren,
} from "../types";

export interface EmbedContextProps {
  data: ComponentHydrateResponseData;
  nodes: ComponentTree;
}

export interface EmbedProviderProps {
  id: string;
  accessToken: string;
  children?: React.ReactNode;
}

export const EmbedContext = createContext<EmbedContextProps>({
  data: {},
  nodes: [],
});

export const EmbedProvider = ({
  children,
  id,
  accessToken,
}: EmbedProviderProps) => {
  const [data, setData] = useState<ComponentHydrateResponseData>({});
  const [nodes, setNodes] = useState<ComponentTree>([]);

  useEffect(() => {
    function parseEditorState(data: Record<string, SerializedNode>) {
      const initialMap: Record<string, SerializedNodeWithChildren> = {};
      const map = Object.entries(data).reduce((acc, [id, node]) => {
        return { ...acc, [id]: { ...node, children: [] } };
      }, initialMap);

      const arr: SerializedNodeWithChildren[] = [];
      Object.entries(data).forEach(([id, node]) => {
        const nodeWithChildren = map[id];
        if (node.parent) {
          map[node.parent]?.children.push(nodeWithChildren!);
        } else {
          arr.push(nodeWithChildren!);
        }
      });

      return arr;
    }

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

    async function fetchComponent() {
      const config = new Configuration({ apiKey: accessToken });
      const api = new ComponentsApi(config);

      try {
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
            setNodes([...parseEditorState(ast)]);
          }
        }

        const { company, component, featureUsage } = data;
        setData({ company, component, featureUsage });
      } catch (error) {
        console.error(error);
      }
    }

    fetchComponent();
  }, [id, accessToken]);

  const contextValue = { data, nodes };
  return (
    <EmbedContext.Provider value={contextValue}>
      {children}
    </EmbedContext.Provider>
  );
};
