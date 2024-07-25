import { createElement } from "react";
import type { SerializedNodeWithChildren } from "../../types";
import { Container } from "../container";
import { CurrentPlan } from "../current-plan";
import { IncludedFeatures } from "../included-features";
import { PlanCard } from "../plan-card";

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
const components: Record<string, (props: any) => JSX.Element | undefined> = {
  Container,
  ResizableContainer: Container,
  CurrentPlan,
  IncludedFeatures,
  PlanCard,
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

    const resolvedChildren = children.map(renderNode);
    const { className, ...rest } = props;
    return createElement(
      component,
      {
        ...rest,
        ...(Object.keys(custom).length > 0 && { custom }),
        key: index,
      },
      resolvedChildren,
    );
  };
}
