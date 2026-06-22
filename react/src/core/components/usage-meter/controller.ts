// Single source of derivation for the usage meter.
//
// `deriveUsage` holds the pure value math; `useUsageMeter` binds it to the
// live entitlement via the WS-backed `useSchematicEntitlement` hook. Both the
// styled wrapper (`UsageMeter.tsx`, same root bundle, relative import) and the
// headless `@schematichq/schematic-react/headless` layer (self-specifier
// import — see `src/headless/usage-meter/Root.tsx`) consume this, so the
// percent/`hasData` logic lives in exactly one place. Keeping the derivation
// in core also means the root entry never has to import the headless tree.

import { type CheckFlagReturn } from "@schematichq/schematic-js";

import { useSchematicEntitlement } from "../../hooks";

export interface UsageMeterData {
  /** The entitlement flag key this meter reflects. */
  flag: CheckFlagReturn["flag"];
  /** Current usage (`featureUsage`), when numeric. */
  usage?: number;
  /** Allocation/limit (`featureAllocation`), when numeric. */
  allocation?: number;
  /** Usage as a 0–100 percentage of the allocation (0 when no allocation). */
  percent: number;
  /** True only when both `usage` and `allocation` are numbers. */
  hasData: boolean;
}

/**
 * Pure derivation from an entitlement check. No hooks, no context — safe to
 * call from anywhere (and to bundle into any surface).
 */
export function deriveUsage(entitlement: CheckFlagReturn): UsageMeterData {
  const allocation =
    typeof entitlement.featureAllocation === "number"
      ? entitlement.featureAllocation
      : undefined;
  const usage =
    typeof entitlement.featureUsage === "number"
      ? entitlement.featureUsage
      : undefined;

  const hasData = typeof allocation === "number" && typeof usage === "number";

  const percent =
    hasData && allocation! > 0
      ? Math.min(
          100,
          Math.max(0, Math.round((usage! / allocation!) * 100 * 100) / 100),
        )
      : 0;

  return { flag: entitlement.flag, usage, allocation, percent, hasData };
}

/**
 * Live usage-meter data for a flag. Thin bind of `deriveUsage` over
 * `useSchematicEntitlement`; usable on its own as a bring-your-own-markup
 * escape hatch (no JSX wrapper required).
 */
export function useUsageMeter(flag: CheckFlagReturn["flag"]): UsageMeterData {
  return deriveUsage(useSchematicEntitlement(flag));
}
