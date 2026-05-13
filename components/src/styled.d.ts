import type { DefaultTheme } from "styled-components";

export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
}

declare module "styled-components" {
  interface DefaultTheme {
    numberOfColumns: 1 | 2 | 3;
    sectionLayout: "merged" | "separate";
    colorMode: "light" | "dark";
    primary: string;
    secondary: string;
    danger: string;
    card: {
      background: string;
      borderRadius: number;
      hasShadow: boolean;
      padding: number;
    };
    typography: {
      heading1: TypographySettings;
      heading2: TypographySettings;
      heading3: TypographySettings;
      heading4: TypographySettings;
      heading5: TypographySettings;
      heading6: TypographySettings;
      text: TypographySettings;
      link: TypographySettings;
    };
  }
}

export type EmbedThemeSettings = DefaultTheme;

export type FontStyle = keyof EmbedThemeSettings["typography"];
