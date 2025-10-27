import * as SchematicJS from "@schematichq/schematic-js";
import { computed, onMounted, onScopeDispose, ref, Ref } from "vue";
import { useSchematic } from "../context";

export interface SchematicComposableOpts {
  client?: SchematicJS.Schematic;
}

export type UseSchematicFlagOpts = SchematicComposableOpts & {
  fallback?: boolean;
};

/**
 * Get the Schematic client instance
 * Can optionally override with a custom client
 */
export const useSchematicClient = (
  opts?: SchematicComposableOpts,
): SchematicJS.Schematic => {
  const schematic = useSchematic();
  const { client } = opts ?? {};

  return client ?? schematic.client;
};

/**
 * Access context management methods
 * Provides setContext method to update user/company context
 *
 * @example
 * ```typescript
 * const { setContext } = useSchematicContext()
 * setContext({
 *   user: { id: 'user-123' },
 *   company: { id: 'company-456' }
 * })
 * ```
 */
export const useSchematicContext = (opts?: SchematicComposableOpts) => {
  const client = useSchematicClient(opts);

  return {
    setContext: (context: SchematicJS.SchematicContext) =>
      client.setContext(context),
  };
};

/**
 * Access event tracking methods
 * Provides identify and track methods for user identification and event tracking
 *
 * @example
 * ```typescript
 * const { identify, track } = useSchematicEvents()
 *
 * // Identify a user and company
 * identify({
 *   keys: { id: 'user-123' },
 *   company: {
 *     keys: { id: 'company-456' },
 *     traits: { plan: 'enterprise' }
 *   }
 * })
 *
 * // Track an event
 * track({ event: 'query' })
 * track({ event: 'query', quantity: 10 })
 * ```
 */
export const useSchematicEvents = (opts?: SchematicComposableOpts) => {
  const client = useSchematicClient(opts);

  const track = (body: SchematicJS.EventBodyTrack) => client.track(body);

  const identify = (body: SchematicJS.EventBodyIdentify) =>
    client.identify(body);

  return {
    track,
    identify,
  };
};

/**
 * Check a feature flag value
 * Returns a reactive ref that updates when the flag value changes
 *
 * @param key - The flag key to check
 * @param opts - Optional configuration including fallback value
 * @returns Ref<boolean> - Reactive boolean value of the flag
 *
 * @example
 * ```typescript
 * const isFeatureEnabled = useSchematicFlag('my-flag-key')
 *
 * // In template
 * <div v-if="isFeatureEnabled">Feature content</div>
 * ```
 */
export const useSchematicFlag = (
  key: string,
  opts?: UseSchematicFlagOpts,
): Ref<boolean> => {
  const client = useSchematicClient(opts);
  const fallback = opts?.fallback ?? false;

  // Get initial value synchronously (works for SSR)
  const flagValue = ref<boolean>(client.getFlagValue(key) ?? fallback);

  // Defer subscription to client-side only (avoids SSR issues)
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    // Subscribe to flag value changes
    unsubscribe = client.addFlagValueListener(key, (value) => {
      flagValue.value = value;
    });
  });

  // Cleanup listener when scope is disposed
  onScopeDispose(() => {
    unsubscribe?.();
  });

  return flagValue;
};

/**
 * Check feature entitlement with usage details
 * Returns reactive refs for flag value, usage, allocation, and exceeded status
 *
 * @param key - The flag/feature key to check
 * @param opts - Optional configuration including fallback value
 * @returns Object with reactive refs for entitlement data
 *
 * @example
 * ```typescript
 * const {
 *   value: isEnabled,
 *   featureUsage,
 *   featureAllocation,
 *   featureUsageExceeded
 * } = useSchematicEntitlement('my-feature-key')
 *
 * // In template
 * <div v-if="featureUsageExceeded">
 *   Usage limit reached: {{ featureUsage }} / {{ featureAllocation }}
 * </div>
 * ```
 */
export const useSchematicEntitlement = (
  key: string,
  opts?: UseSchematicFlagOpts,
) => {
  const client = useSchematicClient(opts);
  const fallback = opts?.fallback ?? false;

  const fallbackCheck: SchematicJS.CheckFlagReturn = {
    flag: key,
    reason: "Fallback",
    value: fallback,
  };

  // Get initial value synchronously (works for SSR)
  const flagCheck = ref<SchematicJS.CheckFlagReturn>(
    client.getFlagCheck(key) ?? fallbackCheck,
  );

  // Defer subscription to client-side only (avoids SSR issues)
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    // Subscribe to flag check changes
    unsubscribe = client.addFlagCheckListener(key, (check) => {
      flagCheck.value = check;
    });
  });

  // Cleanup listener when scope is disposed
  onScopeDispose(() => {
    unsubscribe?.();
  });

  // Return reactive computed values for easier access
  return {
    // Full check object
    check: computed(() => flagCheck.value),
    // Individual properties as computed refs
    value: computed(() => flagCheck.value.value),
    flag: computed(() => flagCheck.value.flag),
    reason: computed(() => flagCheck.value.reason),
    featureUsage: computed(() => flagCheck.value.featureUsage),
    featureAllocation: computed(() => flagCheck.value.featureAllocation),
    featureUsageExceeded: computed(() => flagCheck.value.featureUsageExceeded),
    featureUsageEvent: computed(() => flagCheck.value.featureUsageEvent),
    featureUsagePeriod: computed(() => flagCheck.value.featureUsagePeriod),
    flagId: computed(() => flagCheck.value.flagId),
    ruleId: computed(() => flagCheck.value.ruleId),
    companyId: computed(() => flagCheck.value.companyId),
    userId: computed(() => flagCheck.value.userId),
  };
};

/**
 * Check if Schematic data is still loading
 * Returns a reactive ref that is true while initial flag data is being fetched
 *
 * Useful for showing loading states before displaying flag checks
 *
 * @example
 * ```typescript
 * const isPending = useSchematicIsPending()
 *
 * // In template
 * <div v-if="isPending">Loading...</div>
 * <div v-else-if="isFeatureEnabled">Feature content</div>
 * ```
 */
export const useSchematicIsPending = (
  opts?: SchematicComposableOpts,
): Ref<boolean> => {
  const client = useSchematicClient(opts);

  // Get initial value synchronously (works for SSR)
  const isPending = ref<boolean>(client.getIsPending());

  // Defer subscription to client-side only (avoids SSR issues)
  let unsubscribe: (() => void) | null = null;

  onMounted(() => {
    // Subscribe to isPending changes
    unsubscribe = client.addIsPendingListener((value) => {
      isPending.value = value;
    });
  });

  // Cleanup listener when scope is disposed
  onScopeDispose(() => {
    unsubscribe?.();
  });

  return isPending;
};
