import { createElement } from "react";
import type { SerializedNodeWithChildren } from "../../types";
import { IncludedFeatures, PlanManager } from "../../components/elements";
import { Card } from "../../components/ui";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const components: Record<string, React.FC<any> | undefined> = {
  Card,
  IncludedFeatures,
  PlanManager,
};

interface RenderOptions {
  useFallback?: boolean;
}

export function createRenderer(options?: RenderOptions) {
  const { useFallback = true } = options || {};

  return function renderNode(
    node: SerializedNodeWithChildren,
    index: number,
  ): React.ReactNode {
    const { type, props = {}, custom = {}, children } = node;
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

    const { className, style, ...rootProps } = props;
    const resolvedProps = node.id === "ROOT" ? rootProps : props;
    const resolvedChildren = children.map(renderNode);
    return createElement(
      component,
      {
        ...resolvedProps,
        ...(Object.keys(custom).length > 0 && { custom }),
        key: index,
      },
      resolvedChildren,
    );
  };
}
