// UsageMeter.Root — runs the controller once and publishes context.
//
// Root is a pure provider (renders no DOM of its own) so headless consumers
// supply whatever container element they want. It sources data from the core
// `useUsageMeter` hook via the package self-specifier, which is externalized in
// the /headless bundle — that's what keeps every surface bound to the single
// `SchematicContext` instance provided by `SchematicProvider` (SCHY-372).

import * as React from "react";

import { UsageMeterProvider } from "./context";

import {
  useUsageMeter,
  type CheckFlagReturn,
} from "@schematichq/schematic-react";

export interface UsageMeterRootProps {
  /** Entitlement flag key to meter. */
  flag: CheckFlagReturn["flag"];
  children?: React.ReactNode;
}

export function Root({ flag, children }: UsageMeterRootProps) {
  const value = useUsageMeter(flag);

  // `useUsageMeter` returns a fresh object each render; memoize on its stable
  // primitives so context consumers don't re-render when nothing changed.
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [value.flag, value.usage, value.allocation, value.percent, value.hasData],
  );

  return <UsageMeterProvider value={memoized}>{children}</UsageMeterProvider>;
}

Root.displayName = "UsageMeter.Root";
