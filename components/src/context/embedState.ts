import type { ComponentProps, HydrateDataWithCompanyContext } from "../types";

export interface TypographySettings {
  fontFamily: string;
  fontSize: number;
  fontWeight: number;
  color: string;
}

export interface ThemeSettings {
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

export type FontStyle = keyof ThemeSettings["typography"];

export const defaultTheme: ThemeSettings = {
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

export type EmbedSettings = {
  mode: EmbedMode;
  theme: ThemeSettings;
  badge?: {
    alignment: ComponentProps["$justifyContent"];
    visibility?: ComponentProps["$visibility"];
  };
};

export const defaultSettings: EmbedSettings = {
  mode: "view",
  theme: { ...defaultTheme },
  badge: {
    alignment: "start",
    visibility: "visible",
  },
};

export type EmbedLayout =
  | "portal"
  | "checkout"
  | "payment"
  | "unsubscribe"
  | "disabled";

export type CheckoutState = {
  period?: string;
  planId?: string | null;
  addOnId?: string | null;
  usage?: boolean;
  addOnUsage?: boolean;
  credits?: boolean;
  bypassPlanSelection?: boolean;
};

export type EmbedMode = "edit" | "view";

export interface EmbedState {
  isPending: boolean;
  stale: boolean;
  accessToken?: string;
  data?: HydrateDataWithCompanyContext;
  error?: Error;
  settings: EmbedSettings;
  layout: EmbedLayout;
  checkoutState?: CheckoutState;
}

export const initialState: EmbedState = {
  isPending: false,
  stale: true,
  settings: { ...defaultSettings },
  layout: "portal",
};
