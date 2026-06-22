// Headless UsageMeter parts. None of these ship styling — they emit semantic
// `data-schematic-part` attributes, support `asChild` polymorphism, and expose
// computed data through render props or a CSS custom property.

import * as React from "react";

import {
  Slot,
  USAGE_METER_PERCENT_VAR,
  partAttrs,
  type AsChildProps,
  type RenderProp,
} from "../internal";

import { useUsageMeterContext } from "./context";

// === Track ===

export type TrackProps = AsChildProps<"div">;

/**
 * The meter element. Carries `role="meter"` + the aria value range read from
 * context, and stamps `data-percent`. Default element is a `div`; pass
 * `asChild` to project the behavior onto your own element.
 */
export const Track = React.forwardRef<HTMLDivElement, TrackProps>(
  ({ asChild, children, ...rest }, ref) => {
    const { usage, allocation, percent } = useUsageMeterContext();
    const Comp = asChild ? Slot : "div";
    return (
      <Comp
        ref={ref as React.Ref<never>}
        role="meter"
        aria-valuenow={usage}
        aria-valuemin={0}
        aria-valuemax={allocation}
        data-percent={percent}
        {...partAttrs("track")}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
Track.displayName = "UsageMeter.Track";

// === Fill ===

export type FillProps = AsChildProps<"div">;

/**
 * The fill indicator. Exposes the percent as the
 * `--schematic-usage-meter-percent` custom property (a value, not a width
 * rule) so consumer CSS owns the geometry, e.g.
 * `width: calc(var(--schematic-usage-meter-percent) * 1%)`.
 */
export const Fill = React.forwardRef<HTMLDivElement, FillProps>(
  ({ asChild, style, children, ...rest }, ref) => {
    const { percent } = useUsageMeterContext();
    const Comp = asChild ? Slot : "div";
    // CSS custom properties aren't in the `CSSProperties` key set; cast.
    const fillStyle = {
      [USAGE_METER_PERCENT_VAR]: percent,
      ...style,
    } as React.CSSProperties;
    return (
      <Comp
        ref={ref as React.Ref<never>}
        data-percent={percent}
        style={fillStyle}
        {...partAttrs("fill")}
        {...rest}
      >
        {children}
      </Comp>
    );
  },
);
Fill.displayName = "UsageMeter.Fill";

// === Value (render-prop) ===

export interface ValueRenderProps {
  usage?: number;
  allocation?: number;
  percent: number;
}

/**
 * Exposes the derived numbers through a render prop for labels like
 * `42 / 100` or `42%`. Renders nothing structural of its own.
 */
export function Value({
  children,
}: {
  children: RenderProp<ValueRenderProps>;
}) {
  const { usage, allocation, percent } = useUsageMeterContext();
  return <>{children({ usage, allocation, percent })}</>;
}
Value.displayName = "UsageMeter.Value";

// === Empty (gating) ===

/**
 * Renders children only when the entitlement has no numeric usage/allocation
 * (the state the styled wrapper renders as nothing). Lets headless consumers
 * supply their own fallback.
 */
export function Empty({ children }: { children?: React.ReactNode }) {
  const { hasData } = useUsageMeterContext();
  return hasData ? null : <>{children}</>;
}
Empty.displayName = "UsageMeter.Empty";
