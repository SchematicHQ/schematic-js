import { createElement } from "react";
import { CurrentPlan } from "../current-plan";
import { IncludedFeatures } from "../included-features";
import { PlanManager } from "../plan-manager";
import { SerializedNodeWithChildren } from "./parser";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const components: Record<string, React.FC<any> | undefined> = {
  CurrentPlan,
  IncludedFeatures,
  PlanManager,
};

interface RenderOptions {
  useFallback?: boolean;
}

export function createRenderer(
  propsMap: Record<string, object | undefined>,
  options?: RenderOptions,
) {
  const { useFallback = true } = options || {};

  return function renderNode(
    node: SerializedNodeWithChildren,
    index: number,
  ): React.ReactNode {
    const { type, props, custom, children } = node;
    const name = typeof type !== "string" ? type.resolvedName : type;

    const component = useFallback
      ? components[name] || "div"
      : components[name];
    if (!component) {
      console.warn(
        "`schematic-embed`: Encounted an unknown component during render cycle.",
      );
      return null;
    }

    const contents = useFallback ? propsMap[name] || {} : propsMap[name];
    if (!contents) {
      console.warn("`schematic-embed`: Missing client configuration.");
      return null;
    }

    const resolvedChildren = children.map(renderNode);
    return createElement<{ clientProps: object }>(
      component,
      {
        ...props,
        ...(component !== "div" && { contents }),
        ...(Object.keys(custom).length > 0 && { custom }),
        key: index,
      },
      resolvedChildren,
    );
  };
}
