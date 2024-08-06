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

export interface Settings {
  theme: "light" | "dark";
  sectionLayout: "merged" | "separate";
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  boxShadow: string;
  boxPadding: number;
  design: DesignSettings;
}

export interface DesignSettings {
  typography: TypographyObject;
}

export interface TypographyStyles {
  fontSize: number;
}

export type TypographyTypes =
  | "heading1"
  | "heading2"
  | "heading3"
  | "heading4"
  | "heading5"
  | "heading6"
  | "text"
  | "link";

export type TypographyObject = {
  heading1: TypographyStyles;
  heading2: TypographyStyles;
};

export interface ElementProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
