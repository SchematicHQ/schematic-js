export interface SerializedNode {
  type:
    | string
    | {
        resolvedName: string;
      };
  id: string;
  parent?: string | null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  props: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  custom?: any;
}

export type SerializedNodeWithChildren = SerializedNode & {
  children: SerializedNodeWithChildren[];
};

export type CompressedEditorState = Record<number, number>;
export type SerializedEditorState = Record<string, SerializedNode>;
