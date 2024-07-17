import {
  createElement,
  isValidElement,
  useEffect,
  useMemo,
  useState,
  Children,
} from "react";
import { ThemeProvider } from "styled-components";
import * as Craft from "@craftjs/core";
import { Invoices, NextBillDue, PaymentMethod, PlanManager } from "../";
import { lightTheme, darkTheme } from "./theme";

import testData from "./assets/json/test-data.json";
import testProps from "./assets/json/test-props.json";
// import { GlobalStyle } from "./globalStyle";

const components: Record<string, React.FunctionComponent | undefined> = {
  Invoices,
  PaymentMethod,
  // @ts-expect-error: props are unknown
  PlanManager,
  NextBillDue,
};

type SerializedNode = Omit<Craft.SerializedNode, "parent"> & {
  parent?: string | null;
};

type SerializedNodeWithChildren = SerializedNode & {
  children: SerializedNodeWithChildren[];
};

function parseData(data: Record<string, SerializedNode>) {
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
    const { type, props, children } = node;
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

    const clientProps = useFallback ? propsMap[name] || {} : propsMap[name];
    if (!clientProps) {
      console.warn("`schematic-embed`: Missing client configuration.");
      return null;
    }

    const resolvedChildren = children.map(renderNode);
    return createElement<{ clientProps: object; designProps: object }>(
      component,
      { clientProps, designProps: props, key: index },
      children.length > 0 ? resolvedChildren : name,
    );
  };
}

async function mockFetch(id: string) {
  const data = parseData(testData);
  return new Promise<SerializedNodeWithChildren[]>((resolve) => {
    setTimeout(() => {
      console.debug("test data fetched with id", id);
      resolve(data);
    }, 100); // simulate network delay
  });
}

async function mockFetchProps() {
  return new Promise<Record<string, object | undefined>>((resolve) => {
    setTimeout(() => {
      console.debug("test props fetched");
      resolve(testProps);
    }, 100); // simulate network delay
  });
}

export interface EmbedProps {
  embedId: string;
  theme?: "light" | "dark";
  temporaryAccessToken: string;
}

export const Embed = ({ embedId, theme }: EmbedProps) => {
  const [children, setChildren] = useState<React.ReactNode>("Loading");

  /* const fonts = useMemo(() => {
    const fontSet = new Set<string>();

    function lookForFont(node: React.ReactNode) {
      if (isValidElement(node)) {
        if (node.props.font) {
          fontSet.add(node.props.font);
        }

        Children.forEach(node.props.children, lookForFont);
      }
    }

    Children.forEach(children, lookForFont);

    return [...fontSet];
  }, [children]);

  useEffect(() => {
    if (fonts.length > 0) {
      const src = `https://fonts.googleapis.com/css2?${fonts
        .map((font) => `family=${font}:wght@200..800&display=swap`)
        .join("&")}`;
      const style = document.createElement("link");
      style.rel = "stylesheet";
      style.href = src;
      document.head.appendChild(style);
    }
  }, [fonts]); */

  useEffect(() => {
    Promise.all([mockFetch(embedId), mockFetchProps()]).then(
      ([node, propsMap]) => {
        const renderer = createRenderer(propsMap);
        setChildren(node.map(renderer));
      },
    );
  }, [embedId]);

  return (
    <ThemeProvider theme={theme === "light" ? lightTheme : darkTheme}>
      {children}
    </ThemeProvider>
  );
};
