import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  Children,
} from "react";
import { useEmbed } from "../../hooks";
import { createRenderer } from "./renderer";

export const ComponentTree = () => {
  const styleRef = useRef<HTMLLinkElement | null>(null);

  const [children, setChildren] = useState<React.ReactNode>("Loading");

  const { error, nodes } = useEmbed();

  /**
   * @TODO: load fonts from the root node props
   */
  const fonts = useMemo(() => {
    const fontSet = new Set<string>(["Manrope", "Public Sans", "Inter"]);

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
    const element = document.getElementById("schematic-fonts");
    if (element) {
      return void (styleRef.current = element as HTMLLinkElement);
    }

    const style = document.createElement("link");
    style.id = "schematic-fonts";
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

  if (error) {
    return <div>{error.message}</div>;
  }

  return <>{children}</>;
};
