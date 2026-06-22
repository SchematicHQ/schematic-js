import { type CheckFlagReturn } from "@schematichq/schematic-js";

import {
  UsageMeter as Primitive,
  useUsageMeterContext,
} from "../../../headless/usage-meter";

export interface UsageMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  flag: CheckFlagReturn["flag"];
}

/**
 * The default-styled view over the headless primitives — exactly the shape a
 * consumer would author on top of `@schematichq/schematic-react/headless`:
 * read the derived data from `useUsageMeterContext`, then style the
 * `Track`/`Fill` parts. Visual defaults are wrapped in `var(--…, fallback)` so
 * consumers can restyle without targeting our selectors or using `!important`;
 * the fallbacks keep the component visually functional.
 */
const DefaultUsageMeter = ({
  className,
  style,
  ...rest
}: React.HTMLAttributes<HTMLDivElement>) => {
  const { flag, percent, hasData } = useUsageMeterContext();

  // Match the legacy behavior: render nothing until usage/allocation resolve.
  if (!hasData) {
    return null;
  }

  const trackStyle = {
    height: "var(--schematic-meter-height, 0.5rem)",
    background:
      "var(--schematic-meter-track-background, var(--schematic-color-background, oklch(95% 0 0deg)))",
    overflow: "hidden",
    ...style,
  };

  const fillStyle = {
    width: `${percent}%`,
    height: "100%",
    background: `var(--schematic-meter-fill-background, color-mix(in hsl, green, red ${percent}%))`,
    transition:
      "var(--schematic-meter-fill-transition, var(--schematic-transition, width 200ms ease))",
  };

  return (
    <Primitive.Track
      id={flag}
      data-schematic="usage-meter"
      className={
        className
          ? `schematic-usage-meter ${className}`
          : "schematic-usage-meter"
      }
      style={trackStyle}
      {...rest}
    >
      <Primitive.Fill
        data-schematic="usage-meter-fill"
        className="schematic-usage-meter__fill"
        style={fillStyle}
      />
    </Primitive.Track>
  );
};

/**
 * Default-styled UsageMeter: a thin wrapper that mounts the headless `Root`
 * (which sources live entitlement data) and renders the default view. The
 * public API is unchanged; consumers wanting full control compose the
 * primitives from `@schematichq/schematic-react/headless` directly.
 */
export const UsageMeter = ({ flag, ...rest }: UsageMeterProps) => (
  <Primitive.Root flag={flag}>
    <DefaultUsageMeter {...rest} />
  </Primitive.Root>
);
