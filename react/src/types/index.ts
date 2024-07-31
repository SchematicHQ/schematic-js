// import * as  Craft from "@craftjs/core";

type SerializedNodeType = {
  type:
    | string
    | {
        resolvedName: string;
      };
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  props: Record<string, any>;
  name: string;
  displayName: string;
  isCanvas: boolean;
  parent?: string | null;
  linkedNodes: Record<string, string>;
  nodes: string[];
  hidden: boolean;
  /* eslint-disable-next-line @typescript-eslint/no-explicit-any */
  custom?: any;
  _childCanvas?: Record<string, string>;
};

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

export type CompressedEditorState = Record<number, number>;
export type SerializedEditorState = Record<string, SerializedNode>;

export type SerializedNode = Omit<SerializedNodeType, "parent"> & {
  parent?: string | null;
};

export type SerializedNodeWithChildren = SerializedNode & {
  children: SerializedNodeWithChildren[];
  id?: string;
};

export interface Settings {
  theme: "light" | "dark";
  sectionLayout: "merged" | "separate";
  borderWidth: number;
  borderColor: string;
  borderRadius: number;
  boxShadow: string;
  boxPadding: number;
}

export interface ElementProps {
  children?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}
