import { createElement } from "react";

import type {
  SerializedEditorState,
  SerializedNodeWithChildren,
} from "../../types";
import {
  ButtonElement,
  IncludedFeatures,
  Invoices,
  MeteredFeatures,
  PaymentMethod,
  PlanManager,
  PricingTable,
  TextElement,
  UnsubscribeButton,
  UpcomingBill,
} from "../elements";
import { Card, Column, Root, Viewport } from "../layout";

const components: Record<string, React.FC | undefined> = {
  Root,
  Viewport,
  Column,
  Card,
  PlanManager,
  IncludedFeatures,
  MeteredFeatures,
  UpcomingBill,
  PaymentMethod,
  Invoices,
  PricingTable,
  UnsubscribeButton,
  Button: ButtonElement,
  Text: TextElement,
};

export function isEditorState(obj: unknown): obj is SerializedEditorState {
  return (
    obj !== null &&
    typeof obj === "object" &&
    Object.entries(obj).every(([key, value]) => {
      return typeof key === "string" && typeof value === "object";
    })
  );
}

export function getEditorState(json?: string) {
  if (json) {
    const obj = JSON.parse(json);
    if (isEditorState(obj)) {
      return obj;
    }
  }
}

export function parseEditorState(data: SerializedEditorState) {
  const initialMap: Record<string, SerializedNodeWithChildren> = {};
  const map = Object.entries(data).reduce((acc, [nodeId, node]) => {
    return { ...acc, [nodeId]: { ...node, id: nodeId, children: [] } };
  }, initialMap);

  const arr: SerializedNodeWithChildren[] = [];
  Object.entries(data).forEach(([nodeId, node]) => {
    const nodeWithChildren = map[nodeId];
    if (node.parent) {
      map[node.parent]?.children.push(nodeWithChildren);
    } else {
      arr.push(nodeWithChildren);
    }
  });

  return arr;
}

interface RenderOptions {
  useFallback?: boolean;
}

export function createRenderer(options?: RenderOptions) {
  const { useFallback = false } = options || {};

  return function renderNode(
    node: SerializedNodeWithChildren,
    index: number,
  ): React.ReactNode {
    const { type, props = {}, children } = node;
    const name = typeof type !== "string" ? type.resolvedName : type;

    const component = useFallback
      ? components[name] || "div"
      : components[name];
    if (!components[name]) {
      console.debug(
        "`schematic-embed`: Encountered an unknown component during render cycle.",
        name,
      );
    }

    if (!component) {
      return null;
    }

    const { className, ...rest } = props;
    const resolvedProps = component === "div" ? rest : props;
    const resolvedChildren = children.map(renderNode);
    return createElement(
      component,
      {
        key: index,
        className,
        ...(component !== "div" && { ...resolvedProps }),
      },
      resolvedChildren,
    );
  };
}
