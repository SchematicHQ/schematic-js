import { createElement } from "react";

import type { SerializedNodeWithChildren } from "../../types";
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
