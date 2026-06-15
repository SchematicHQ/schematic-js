// Typed scoped-context factory for the composable primitives.
//
// Each compound component (`PricingTable`, `PaymentMethod`, …) creates one of
// these for its `Root` to publish through and its parts to consume. The
// consumer hook throws a clear, named error when used outside the matching
// `Root`, which is the standard Radix ergonomic.

import * as React from "react";

export interface PrimitiveProviderProps<T> {
  value: T;
  children: React.ReactNode;
}

export function createPrimitiveContext<T>(displayName: string) {
  const Context = React.createContext<T | null>(null);
  Context.displayName = displayName;

  /**
   * Dumb provider — callers (the `Root`) are responsible for memoizing
   * `value` so consumers don't re-render needlessly.
   */
  function Provider({ value, children }: PrimitiveProviderProps<T>) {
    return <Context.Provider value={value}>{children}</Context.Provider>;
  }
  Provider.displayName = `${displayName}.Provider`;

  function usePrimitiveContext(consumerName: string): T {
    const context = React.useContext(Context);
    if (context === null) {
      throw new Error(
        `\`${consumerName}\` must be rendered inside \`${displayName}.Root\`.`,
      );
    }
    return context;
  }

  return [Provider, usePrimitiveContext, Context] as const;
}
