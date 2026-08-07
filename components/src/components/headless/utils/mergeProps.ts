type UnknownProps = Record<string, unknown>;

/**
 * Merge two props objects, giving precedence to `overrides` while intelligently
 * combining the props that should never be clobbered:
 *
 * - `on*` event handlers are chained (both run; the override runs first),
 * - `className` values are concatenated,
 * - `style` objects are shallow-merged (override wins per-property),
 * - everything else takes the override value when it is defined, otherwise base.
 *
 * This mirrors the `mergeProps` semantics used by Radix/Zag and is the basis for
 * both the compound-component prop-getters and the `Slot` (`asChild`) merging.
 */
export function mergeProps<T extends UnknownProps, U extends UnknownProps>(
  base: T,
  overrides: U,
): T & U {
  const result: UnknownProps = { ...base };

  for (const key in overrides) {
    const baseValue = result[key];
    const overrideValue = overrides[key];

    if (
      /^on[A-Z]/.test(key) &&
      typeof baseValue === "function" &&
      typeof overrideValue === "function"
    ) {
      // chain event handlers: the caller's handler runs, then the getter's
      result[key] = (...args: unknown[]) => {
        (overrideValue as (...a: unknown[]) => void)(...args);
        (baseValue as (...a: unknown[]) => void)(...args);
      };
    } else if (key === "className") {
      result[key] = [baseValue, overrideValue].filter(Boolean).join(" ");
    } else if (key === "style") {
      result[key] = {
        ...(baseValue as object | undefined),
        ...(overrideValue as object | undefined),
      };
    } else {
      result[key] = overrideValue ?? baseValue;
    }
  }

  return result as T & U;
}
