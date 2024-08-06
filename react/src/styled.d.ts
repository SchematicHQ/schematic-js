import "styled-components";

export interface EmbedThemeTypographySettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
}

export interface EmbedThemeSettings {
  numberOfColumns: 1 | 2 | 3;
  sectionLayout: "merged" | "separate";
  colorMode: "light" | "dark";
  primary: string;
  secondary: string;
  card: {
    background: string;
    borderRadius: number;
    hasShadow: boolean;
    padding: number;
  };
  typography: {
    heading1: EmbedThemeTypographySettings;
    heading2: EmbedThemeTypographySettings;
    heading3: EmbedThemeTypographySettings;
    heading4: EmbedThemeTypographySettings;
    heading5: EmbedThemeTypographySettings;
    heading6: EmbedThemeTypographySettings;
    text: EmbedThemeTypographySettings;
    link: EmbedThemeTypographySettings;
  };
}

declare module "styled-components" {
  interface DefaultTheme extends EmbedThemeSettings {}
}
