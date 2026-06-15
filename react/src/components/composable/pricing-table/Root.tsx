// PricingTable.Root — runs the controller once and publishes context.
//
// Root is a pure provider (renders no DOM of its own) so the styled wrapper
// can reproduce today's markup exactly and headless consumers can supply
// whatever container element they want.

import * as React from "react";

import {
  PricingTableProvider,
  usePricingTableController,
  type PricingTableOptions,
} from "./context";

export interface PricingTableRootProps extends PricingTableOptions {
  children?: React.ReactNode;
}

export function Root({ children, ...options }: PricingTableRootProps) {
  const value = usePricingTableController(options);

  // `options` is spread fresh each render; memoize on the stable primitives so
  // consumers don't re-render when only `children` changes.
  const memoized = React.useMemo(
    () => value,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      value.plans,
      value.addOns,
      value.periods,
      value.currencies,
      value.selectedPeriod,
      value.selectedCurrency,
      value.isPending,
      value.currentPlan,
      value.selectPlan,
      value.getPlanPeriod,
    ],
  );

  return (
    <PricingTableProvider value={memoized}>{children}</PricingTableProvider>
  );
}

Root.displayName = "PricingTable.Root";
