import * as Craft from "@craftjs/core";

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P];
};

export type TransientCSSProperties = {
  [Property in keyof React.CSSProperties as `$${string & Property}`]: React.CSSProperties[Property];
};
export interface ComponentProps extends TransientCSSProperties {
  children?: React.ReactNode;
}

export type SerializedNode = Omit<Craft.SerializedNode, "parent"> & {
  id: string;
  parent?: string | null;
};

export type SerializedNodeWithChildren = SerializedNode & {
  children: SerializedNodeWithChildren[];
};

export type CompressedEditorState = Record<number, number>;
export type SerializedEditorState = Record<string, SerializedNode>;

interface EmbedThemeColorSettings {
  primary: string;
  secondary: string;
  text: string;
  link: string;
  card: string;
}

export interface EmbedThemeSettings {
  numberOfColumns: 1 | 2 | 3;
  sectionLayout: "merged" | "separate";
  colorMode: "light" | "dark";
  light: EmbedThemeColorSettings;
  dark: EmbedThemeColorSettings;
  card: {
    borderRadius: number;
    hasShadow: boolean;
    padding: number;
  };
}

export interface EmbedSettings {
  theme: EmbedThemeSettings;
}

export type EmbedLayout = "portal" | "checkout" | "payment" | "disabled";

export interface ElementProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
