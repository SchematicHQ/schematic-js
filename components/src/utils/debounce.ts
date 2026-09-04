import { type DebounceSettings } from "lodash";
import debounce from "lodash/debounce";

/**
 * Wraps `fn` so that each distinct key gets its own debounce window.
 *
 * A single `lodash/debounce` instance is shared by every caller, and with
 * `{leading: true}` a suppressed call is handed back the result of the last
 * real invocation. That is what we want for a fetch with no arguments — one
 * request, everyone shares it — but it is wrong for a per-resource fetch: two
 * sections mounting in the same tick would both receive the first section's
 * promise, and so render the first section's data.
 *
 * Keying by the resource id keeps the collapsing behavior within a resource
 * (a remount inside the window still reuses the in-flight request) while
 * keeping separate resources genuinely separate.
 */
export function debounceByKey<A extends unknown[], R>(
  fn: (key: string, ...args: A) => R,
  wait: number,
  settings?: DebounceSettings,
) {
  const debouncedByKey = new Map<string, (key: string, ...args: A) => R>();

  return (key: string, ...args: A): R => {
    let debounced = debouncedByKey.get(key);
    if (!debounced) {
      debounced = debounce(fn, wait, settings) as unknown as (
        key: string,
        ...args: A
      ) => R;
      debouncedByKey.set(key, debounced);
    }

    return debounced(key, ...args);
  };
}
