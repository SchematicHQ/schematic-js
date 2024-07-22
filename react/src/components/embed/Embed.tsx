import {
  isValidElement,
  useEffect,
  useMemo,
  useRef,
  useState,
  Children,
} from "react";
import { ThemeProvider } from "styled-components";
import { fetchComponent } from "./fetcher";
import { createRenderer } from "./renderer";
import { light, dark } from "./theme";

export interface EmbedProps {
  accessToken: string;
  id: string;
  theme?: "light" | "dark";
}

export const Embed = ({ id, accessToken, theme = "light" }: EmbedProps) => {
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
      return void setChildren(<div>Please provide an access token.</div>);
    }

    if (!accessToken.startsWith("token_")) {
      return void setChildren(
        <div>
          Invalid access token; your temporary access token will start with
          "token_".
        </div>,
      );
    }

    fetchComponent(id, accessToken).then(({ editorState, componentProps }) => {
      const renderer = createRenderer(componentProps);
      setChildren(editorState.map(renderer));
    });
  }, [id, accessToken]);

  return (
    <ThemeProvider theme={theme === "dark" ? dark : light}>
      {children}
    </ThemeProvider>
  );
};
