import { type CheckFlagReturn } from "@schematichq/schematic-js";

import { useSchematicEntitlement } from "../../hooks";

export interface UsageMeterProps extends React.HTMLAttributes<HTMLDivElement> {
  flag: CheckFlagReturn["flag"];
}

export const UsageMeter = ({
  flag,
  className,
  style,
  ...rest
}: UsageMeterProps) => {
  const entitlement = useSchematicEntitlement(flag);

  const max = entitlement.featureAllocation;
  if (typeof max !== "number") {
    return;
  }

  const value = entitlement.featureUsage;
  if (typeof value !== "number") {
    return;
  }

  const percent =
    max > 0
      ? Math.min(100, Math.max(0, Math.round((value / max) * 100 * 100) / 100))
      : 0;

  // Visual defaults are wrapped in `var(--…, fallback)` so consumers can
  // restyle without targeting our selectors or using `!important`.
  // The fallbacks keep the component visually functional
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
    <div
      id={flag}
      role="meter"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      data-schematic="usage-meter"
      className={
        className
          ? `schematic-usage-meter ${className}`
          : "schematic-usage-meter"
      }
      style={trackStyle}
      {...rest}
    >
      <div
        data-schematic="usage-meter-fill"
        className="schematic-usage-meter__fill"
        style={fillStyle}
      />
    </div>
  );
};
