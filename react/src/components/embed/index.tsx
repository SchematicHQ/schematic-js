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

import { lightTheme, darkTheme } from "./theme";
// import { GlobalStyle } from "./globalStyle";

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

async function fetchComponent(name: string, temporaryAccessToken: string) {
  const controller = new AbortController();
  const parsedEditorState = parseEditorState(testData.editorState);

  return new Promise<{
    editorState: SerializedNodeWithChildren[];
    componentProps: Record<string, object | undefined>;
  }>((resolve) => {
    fetch(`https://localhost/components/embed/${name}`, {
      headers: {
        "X-Temporary-Access-Token": temporaryAccessToken,
      },
      signal: controller.signal,
    })
      .catch(() => {
        // do nothing
      })
      .finally(() => {
        resolve({
          editorState: parsedEditorState,
          componentProps: testData.componentProps,
        });
      });

    setTimeout(() => {
      controller.abort();
    });
  });
}

export interface EmbedProps {
  name: string;
  temporaryAccessToken: string;
  theme?: "light" | "dark";
}

export const Embed = ({ name, temporaryAccessToken, theme }: EmbedProps) => {
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
    fetchComponent(name, temporaryAccessToken).then(
      ({ editorState, componentProps }) => {
        const renderer = createRenderer(componentProps);
        setChildren(editorState.map(renderer));
      },
    );
  }, [name, temporaryAccessToken]);

  return (
    <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
      {children}
    </ThemeProvider>
  );
};
