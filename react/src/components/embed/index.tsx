import {
  createElement,
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  Children,
} from "react";
import { ThemeProvider } from "styled-components";
import * as Craft from "@craftjs/core";

import { CurrentPlan } from "../current-plan";
import { IncludedFeatures } from "../included-features";
import { PlanManager } from "../plan-manager";

import { light, dark } from "./theme";

import testData from "./assets/json/test-data.json";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const components: Record<string, React.FunctionComponent<any> | undefined> = {
  CurrentPlan,
  IncludedFeatures,
  PlanManager,
};

type SerializedNode = Omit<Craft.SerializedNode, "parent"> & {
  parent?: string | null;
};

type SerializedNodeWithChildren = SerializedNode & {
  children: SerializedNodeWithChildren[];
};

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

interface RenderOptions {
  useFallback?: boolean;
}

function createRenderer(
  propsMap: Record<string, object | undefined>,
  options?: RenderOptions,
) {
  const { useFallback = true } = options || {};

  return function renderNode(
    node: SerializedNodeWithChildren,
    index: number,
  ): React.ReactNode {
    const { type, props, custom, children } = node;
    const name = typeof type !== "string" ? type.resolvedName : type;

    const component = useFallback
      ? components[name] || "div"
      : components[name];
    if (!component) {
      console.warn(
        "`schematic-embed`: Encounted an unknown component during render cycle.",
      );
      return null;
    }

    const contents = useFallback ? propsMap[name] || {} : propsMap[name];
    if (!contents) {
      console.warn("`schematic-embed`: Missing client configuration.");
      return null;
    }

    const resolvedChildren = children.map(renderNode);
    return createElement<{ clientProps: object }>(
      component,
      {
        ...props,
        ...(component !== "div" && { contents }),
        ...(Object.keys(custom).length > 0 && { custom }),
        key: index,
      },
      resolvedChildren,
    );
  };
}

async function fetchComponent(id: string, accessToken: string) {
  const apiUrl = "https://api.schematichq.com";
  const parsedEditorState = parseEditorState(testData.editorState);

  return new Promise<{
    editorState: SerializedNodeWithChildren[];
    componentProps: Record<string, object | undefined>;
  }>((resolve) => {
    fetch(`${apiUrl}/components/${id}/hydrate`, {
      headers: {
        "X-Schematic-Api-Key": accessToken,
      },
    })
    .then((response) => {
      console.log(response);
      resolve({
        editorState: parsedEditorState,
        componentProps: testData.componentProps,
      });
    }).catch((r) => {
      console.log("OH NO!", r);
    });
  });
}

export interface EmbedProps {
  accessToken: string;
  id: string;
  theme?: "light" | "dark";
}

export const Embed = ({
  id,
  accessToken,
  theme = "light",
}: EmbedProps) => {
  const styleRef = useRef<HTMLLinkElement | null>(null);
  const [children, setChildren] = useState<React.ReactNode>("Loading");

  const fonts = useMemo(() => {
    const fontSet = new Set<string>();
    function lookForFont(node: React.ReactNode) {
      if (isValidElement(node)) {
        const fonts = node.props?.custom?.fonts as string[] | undefined;
        fonts?.forEach((font) => {
          fontSet.add(font);
        });
        Children.forEach(node.props.children, lookForFont);
      }
    }
    Children.forEach(children, lookForFont);
    return [...fontSet];
  }, [children]);

  useEffect(() => {
    const style = document.createElement("link");
    style.rel = "stylesheet";
    document.head.appendChild(style);
    styleRef.current = style;
  }, []);

  useEffect(() => {
    if (fonts.length > 0) {
      const src = `https://fonts.googleapis.com/css2?${fonts
        .map((font) => `family=${font}:wght@200..800&display=swap`)
        .join("&")}`;
      if (styleRef.current) {
        styleRef.current.href = src;
      }
    }
  }, [fonts]);

  useEffect(() => {
    if (accessToken.length === 0) {
      setChildren(<div>Please provide an access token.</div>);
    } else if (accessToken.slice(0, 6) !== "token_") {
      setChildren(<div>Invalid access token; your temporary access token will start with "token_"</div>);
    } else {
      fetchComponent(id, accessToken).then(
        ({ editorState, componentProps }) => {
          const renderer = createRenderer(componentProps);
          setChildren(editorState.map(renderer));
        },
      );
    }
  }, [id, accessToken]);

  return (
    <ThemeProvider theme={theme === "dark" ? dark : light}>
      {children}
    </ThemeProvider>
  );
};
