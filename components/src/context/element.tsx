import "../locales";

import merge from "lodash/merge";
import { createContext, useEffect, useRef, useState } from "react";
import { ThemeProvider } from "styled-components";

import { EmbedThemeSettings } from "../context";
import type { RecursivePartial } from "../types";
import { GlobalStyle } from "./styles";

const defaultTheme: EmbedThemeSettings = {
  numberOfColumns: 2,
  sectionLayout: "merged",
  colorMode: "light",
  primary: "#000000",
  secondary: "#194BFB",
  danger: "#D75A5C",
  card: {
    background: "#FFFFFF",
    borderRadius: 10,
    hasShadow: true,
    padding: 45,
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
      fontSize: 29,
      fontWeight: 800,
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
      fontWeight: 800,
      color: "#000000",
    },
    heading5: {
      fontFamily: "Public Sans",
      fontSize: 17,
      fontWeight: 500,
      color: "#000000",
    },
    heading6: {
      fontFamily: "Public Sans",
      fontSize: 14,
      fontWeight: 400,
      color: "#8A8A8A",
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

export type ElementSettings = {
  theme: EmbedThemeSettings;
};

const defaultSettings: ElementSettings = {
  theme: { ...defaultTheme },
};

export interface ElementContextProps {
  settings: ElementSettings;
  updateSettings: (settings: RecursivePartial<ElementSettings>) => void;
}

export const ElementContext = createContext<ElementContextProps>({
  settings: { ...defaultSettings },
  updateSettings: () => {},
});

export interface ElementProviderProps {
  children?: React.ReactNode;
  debug?: boolean;
}

export const ElementProvider = ({ children }: ElementProviderProps) => {
  const styleRef = useRef<HTMLLinkElement | null>(null);

  const [state, setState] = useState(() => {
    return {
      settings: { ...defaultSettings },
      updateSettings: () => {},
    };
  });

  const updateSettings = (settings: RecursivePartial<ElementSettings>) => {
    setState((prev) => {
      const updatedSettings = merge({}, prev.settings, { ...settings });
      return {
        ...prev,
        settings: updatedSettings,
      };
    });
  };

  const initFontStylesheet = () => {
    const element = document.getElementById("schematic-fonts");
    if (element) {
      styleRef.current = element as HTMLLinkElement;
      return;
    }

    const style = document.createElement("link");
    style.id = "schematic-fonts";
    style.rel = "stylesheet";
    document.head.appendChild(style);
    styleRef.current = style;
  };

  useEffect(() => {
    initFontStylesheet();
  }, []);

  useEffect(() => {
    const fontSet = new Set<string>([]);
    Object.values(state.settings.theme.typography).forEach(({ fontFamily }) => {
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
  }, [state.settings.theme.typography]);

  return (
    <ElementContext.Provider
      value={{
        settings: state.settings,
        updateSettings,
      }}
    >
      <ThemeProvider theme={state.settings.theme}>
        <GlobalStyle />
        {children}
      </ThemeProvider>
    </ElementContext.Provider>
  );
};
