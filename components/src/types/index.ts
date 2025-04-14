import * as Craft from "@craftjs/core";

export type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends (infer U)[]
    ? RecursivePartial<U>[]
    : T[P] extends object | undefined
      ? RecursivePartial<T[P]>
      : T[P];
};

export type FastOmit<T extends object, U extends string | number | symbol> = {
  [K in keyof T as K extends U ? never : K]: T[K];
};

export type Substitute<A extends object, B extends object> = FastOmit<
  A,
  keyof B
> &
  B;

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

export interface ElementProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}

export type ComponentStyle = "primary" | "secondary" | "tertiary";
