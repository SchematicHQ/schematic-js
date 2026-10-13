import React, {
  createContext,
  useContext,
  useMemo,
  useRef,
  useState,
} from "react";

import { Checkout, type CheckoutProps } from "../Checkout";
import { isDevelopment } from "../common";
import type { CheckoutConfig } from "../model";

/** Opens the one `<Checkout />` a `CheckoutLauncherProvider` renders. */
export interface CheckoutLauncher {
  /** Opens a new checkout on `config` over the provider's `defaults`. */
  open: (config?: CheckoutConfig) => void;
  close: () => void;
  isOpen: boolean;
}

export interface CheckoutLauncherProviderProps extends Omit<
  CheckoutProps,
  "open" | "onOpenChange" | keyof CheckoutConfig
> {
  /** Under every `open(config)`, section by section. */
  defaults?: CheckoutConfig;
  onOpenChange?: (open: boolean) => void;
  children?: React.ReactNode;
}

const LauncherContext = createContext<CheckoutLauncher | null>(null);

/** Each section of `config` over the same section of `defaults`. */
function merge(
  defaults: CheckoutConfig | undefined,
  config: CheckoutConfig | undefined,
): CheckoutConfig {
  return {
    catalogId: config?.catalogId ?? defaults?.catalogId,
    display: { ...defaults?.display, ...config?.display },
    selection: { ...defaults?.selection, ...config?.selection },
    steps: { ...defaults?.steps, ...config?.steps },
  };
}

/**
 * Renders one `<Checkout />` and hands `useCheckoutLauncher` below it the way
 * to open it, so a plan card, an upgrade prompt or a "buy more" link can start
 * a purchase without holding the dialog's state. Every open starts a new cart.
 */
export function CheckoutLauncherProvider({
  children,
  defaults,
  onOpenChange,
  ...props
}: CheckoutLauncherProviderProps) {
  const [opened, setOpened] = useState<{
    config: CheckoutConfig;
    count: number;
  } | null>(null);
  const opens = useRef(0);

  const launcher = useMemo<CheckoutLauncher>(
    () => ({
      open: (config) => {
        opens.current += 1;
        setOpened({ config: merge(defaults, config), count: opens.current });
        onOpenChange?.(true);
      },
      close: () => {
        setOpened(null);
        onOpenChange?.(false);
      },
      isOpen: opened !== null,
    }),
    [defaults, onOpenChange, opened],
  );

  return (
    <LauncherContext.Provider value={launcher}>
      {children}
      <Checkout
        {...props}
        {...opened?.config}
        // A new key per open, so a second open never resumes the first cart.
        key={opened?.count ?? 0}
        open={opened !== null}
        onOpenChange={(next) => {
          if (!next) {
            launcher.close();
          }
        }}
      />
    </LauncherContext.Provider>
  );
}

const detached: CheckoutLauncher = {
  open: () => {
    if (isDevelopment) {
      console.error(
        "Schematic: useCheckoutLauncher().open() needs a CheckoutLauncherProvider above it.",
      );
    }
  },
  close: () => {},
  isOpen: false,
};

/**
 * The way to open the checkout the nearest `CheckoutLauncherProvider`
 * renders. Outside one, `open` does nothing and says so in development.
 */
export function useCheckoutLauncher(): CheckoutLauncher {
  return useContext(LauncherContext) ?? detached;
}
