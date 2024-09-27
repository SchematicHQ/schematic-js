import { createElement } from "react";
import type { SerializedNodeWithChildren } from "../../types";
import { Root, Viewport, Column, Card } from "../../components/layout";
import {
  PlanManager,
  IncludedFeatures,
  UpcomingBill,
  PaymentMethod,
  SchematicBrand,
} from "../../components/elements";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const components: Record<string, React.FC<any> | undefined> = {
  Root,
  Viewport,
  Column,
  Card,
  PlanManager,
  IncludedFeatures,
  UpcomingBill,
  PaymentMethod,
  SchematicBrand,
};

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
        "`schematic-embed`: Encounted an unknown component during render cycle.",
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
