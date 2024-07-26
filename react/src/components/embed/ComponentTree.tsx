import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  Children,
} from "react";
import { ThemeProvider } from "styled-components";
import { useSchematicEmbed } from "../../hooks";
import { createRenderer } from "./renderer";
import { light, dark } from "./theme";

export const ComponentTree = () => {
  const styleRef = useRef<HTMLLinkElement | null>(null);

  const [children, setChildren] = useState<React.ReactNode>("Loading");

  const { nodes } = useSchematicEmbed();
  const root = nodes.at(0);

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
    const renderer = createRenderer();
    setChildren(nodes.map(renderer));
  }, [nodes]);

  return (
    <ThemeProvider theme={root?.props.theme === "dark" ? dark : light}>
      {children}
    </ThemeProvider>
  );
};
