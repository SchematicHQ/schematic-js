import * as Craft from "@craftjs/core";

type SerializedNode = Omit<Craft.SerializedNode, "parent"> & {
  parent?: string | null;
};

export type SerializedNodeWithChildren = SerializedNode & {
  children: SerializedNodeWithChildren[];
};

export function parseEditorState(data: Record<string, SerializedNode>) {
  const initialMap: Record<string, SerializedNodeWithChildren> = {};
  const map = Object.entries(data).reduce((acc, [id, node]) => {
    return { ...acc, [id]: { ...node, children: [] } };
  }, initialMap);

  const arr: SerializedNodeWithChildren[] = [];
  Object.entries(data).forEach(([id, node]) => {
    const nodeWithChildren = map[id];
    if (node.parent) {
      map[node.parent]?.children.push(nodeWithChildren!);
    } else {
      arr.push(nodeWithChildren!);
    }
  });

  return arr;
}
