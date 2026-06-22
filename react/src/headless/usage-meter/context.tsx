// Context for the UsageMeter primitive. `Root` runs the controller and
// publishes a `UsageMeterData` value here; parts (and consumers, via
// `useUsageMeterContext`) read it.

import { createPrimitiveContext } from "../internal";

import { type UsageMeterData } from "@schematichq/schematic-react";

export type { UsageMeterData };

const [UsageMeterProvider, useUsageMeterPrimitiveContext, UsageMeterContext] =
  createPrimitiveContext<UsageMeterData>("UsageMeter");

export { UsageMeterContext, UsageMeterProvider };

/**
 * Consumer-facing hook for the current meter's derived data. Throws when used
 * outside `UsageMeter.Root`. Named distinctly from the core `useUsageMeter(flag)`
 * hook, which takes a flag and runs the entitlement check itself.
 */
export function useUsageMeterContext(): UsageMeterData {
  return useUsageMeterPrimitiveContext("useUsageMeterContext");
}
