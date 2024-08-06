import * as Craft from "@craftjs/core";
import type { EmbedThemeSettings } from "../styled";

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

export type FontStyle = keyof EmbedThemeSettings["typography"];

export interface EmbedSettings {
  theme: EmbedThemeSettings;
}

export type EmbedLayout = "portal" | "checkout" | "payment" | "disabled";

export interface ElementProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
