// Shared types for the headless composable layer.

import type * as React from "react";

/**
 * Props for a headless primitive part that supports `asChild` polymorphism.
 * When `asChild` is true the part renders its single child (via `Slot`)
 * instead of its default element, merging behavior/props onto it.
 */
export type AsChildProps<E extends React.ElementType> =
  React.ComponentPropsWithoutRef<E> & {
    asChild?: boolean;
  };

/**
 * A render-prop child: a function receiving derived data and returning a node.
 * Used by parts (e.g. `PricingTable.PlanPrice`) that expose computed values a
 * consumer styles however they like.
 */
export type RenderProp<T> = (value: T) => React.ReactNode;
