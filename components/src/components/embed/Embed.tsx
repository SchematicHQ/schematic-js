import merge from "lodash/merge";
import { inflate } from "pako";
import { useEffect, useReducer, useRef, useState } from "react";
import { ThemeProvider } from "styled-components";

import { useEmbed } from "../../hooks";
import type {
  SerializedEditorState,
  SerializedNodeWithChildren,
} from "../../types";
import {
  defaultSettings,
  type EmbedSettings,
  initialState,
} from "./componentState";
import { ComponentTree } from "./ComponentTree";
import { reducer } from "./reducer";
import { GlobalStyle } from "./styles";

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
  /* nodes: SerializedNodeWithChildren[];
  settings: EmbedSettings;
  updateSettings: (settings: RecursivePartial<EmbedSettings>) => void;
  layout: EmbedLayout;
  setLayout: (layout: EmbedLayout) => void;
  mode: EmbedMode;
  selected: EmbedSelected;
  setSelected: (selected: EmbedSelected) => void; */
}

export const SchematicEmbed = ({ id, accessToken }: EmbedProps) => {
  const styleRef = useRef<HTMLLinkElement>(null);

  const [state, dispatch] = useReducer(reducer, initialState);

  const [error, setError] = useState<Error>();
  const [nodes, setNodes] = useState<SerializedNodeWithChildren[]>([]);
  const [settings, setSettings] = useState({ ...defaultSettings });

  const { data, hydrateComponent } = useEmbed();

  useEffect(() => {
    const element = document.getElementById(
      "schematic-fonts",
    ) as HTMLLinkElement;
    if (element) {
      styleRef.current = element;
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
    Object.values(settings.theme.typography).forEach(({ fontFamily }) => {
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
  }, [styleRef, settings.theme.typography]);

  useEffect(() => {
    if (id && accessToken) {
      hydrateComponent(id, accessToken);
    }
  }, [id, accessToken, hydrateComponent]);

  useEffect(() => {
    try {
      // check for `hydrate` data
      if (!data || !("component" in data)) {
        return;
      }

      if (data.component?.ast) {
        const parsedNodes: SerializedNodeWithChildren[] = [];
        const parsedSettings: EmbedSettings = { ...defaultSettings };
        const compressed = data.component.ast;
        // `inflate` actually returns `string | undefined`
        const json: string | undefined = inflate(
          Uint8Array.from(Object.values(compressed)),
          { to: "string" },
        );
        const ast = getEditorState(json);
        if (ast) {
          merge(parsedSettings, ast.ROOT.props.settings);
          setSettings(parsedSettings);

          parsedNodes.push(...parseEditorState(ast));
          setNodes(parsedNodes);
        }
      }
    } catch (error) {
      setError(
        error instanceof Error
          ? error
          : new Error("An unknown error occurred."),
      );
    }
  }, [data]);

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

  if (error) {
    return <div>{error.message}</div>;
  }

  return (
    <ThemeProvider theme={settings.theme}>
      <GlobalStyle />
      <ComponentTree nodes={nodes} state={state} dispatch={dispatch} />
    </ThemeProvider>
  );
};
