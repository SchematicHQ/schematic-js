import { useMemo } from "react";

export interface UseUsageMeterProps {
  /** The current usage value (e.g. `entitlement.featureUsage`). */
  value: number;
  /** The maximum/allocation value (e.g. `entitlement.featureAllocation`). */
  max: number;
  /** The minimum of the range. Defaults to `0`. */
  min?: number;
  /** Optional accessible name applied as `aria-label` on the root. */
  label?: string;
  /**
   * Id of an element labelling the meter, applied as `aria-labelledby` on the
   * root. The `<UsageMeter.Label>` part wires this automatically; hook-only
   * consumers can pass it directly.
   */
  labelId?: string;
}

type PropGetter = () => React.HTMLAttributes<HTMLElement> &
  Record<string, unknown>;

export interface UsageMeterApi {
  /** The `value` clamped into `[min, max]`. */
  value: number;
  min: number;
  max: number;
  /** Fill percentage in `[0, 100]`, rounded to two decimals. */
  percent: number;
  getRootProps: PropGetter;
  getTrackProps: PropGetter;
  getFillProps: PropGetter;
  getLabelProps: PropGetter;
  getValueTextProps: PropGetter;
}

const clamp = (n: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, n));

/**
 * Headless logic for a usage meter. Pure and controlled — it fetches nothing;
 * the caller supplies `value`/`max`/`min` (typically from
 * `useSchematicEntitlement`) and spreads the returned prop-getters onto their
 * own markup, or lets the `UsageMeter.*` compound components do it.
 */
export function useUsageMeter({
  value,
  max,
  min = 0,
  label,
  labelId,
}: UseUsageMeterProps): UsageMeterApi {
  return useMemo(() => {
    const clampedValue = clamp(value, min, max);
    const percent =
      max > min
        ? Math.round(((clampedValue - min) / (max - min)) * 100 * 100) / 100
        : 0;
    const roundedPercent = Math.round(percent);

    return {
      value: clampedValue,
      min,
      max,
      percent,
      getRootProps: () => ({
        "role": "meter",
        "aria-valuenow": clampedValue,
        "aria-valuemin": min,
        "aria-valuemax": max,
        "aria-valuetext": `${roundedPercent}%`,
        ...(label ? { "aria-label": label } : {}),
        ...(labelId ? { "aria-labelledby": labelId } : {}),
        "data-schematic": "usage-meter",
        "data-part": "root",
      }),
      getTrackProps: () => ({
        "data-schematic": "usage-meter-track",
        "data-part": "track",
      }),
      getFillProps: () => ({
        "data-schematic": "usage-meter-fill",
        "data-part": "fill",
        // functional style only — visual styling is left to CSS
        "style": { width: `${percent}%` },
      }),
      getLabelProps: () => ({
        "data-schematic": "usage-meter-label",
        "data-part": "label",
      }),
      getValueTextProps: () => ({
        "data-schematic": "usage-meter-value-text",
        "data-part": "value-text",
        "children": `${roundedPercent}%`,
      }),
    };
  }, [value, max, min, label, labelId]);
}
