import * as Craft from "@craftjs/core";

export type SerializedNode = Omit<Craft.SerializedNode, "parent"> & {
  id: string;
  parent?: string | null;
};

export type SerializedNodeWithChildren = SerializedNode & {
  children: SerializedNodeWithChildren[];
};

export type CompressedEditorState = Record<number, number>;
export type SerializedEditorState = Record<string, SerializedNode>;
