// `@schematichq/schematic-react/components` — UI surface.
//
// Re-exports the public surface from the root entry (hooks, context, types)
// and ships the embed UI components as `lazy`-wrapped exports. Each
// page-level component lives behind a dynamic import so its module graph —
// including styled-components and the rest of the UI tree it composes —
// stays out of the consumer's main bundle until the component first mounts.
//
// Note: unlike the prior version, the `SchematicProvider` exported here does
// NOT eagerly bind `EmbedAdapter`. The adapter is loaded via the Path C
// lazy mechanism (see `src/embed-loader.ts`) the first time any descendant
// calls an embed hook or mounts one of the lazy UI components below. This
// is what allows styled-components to stay out of the /components main
// bundle. If you want the adapter eagerly mounted (no Suspense flash on
// first embed render), pass a custom `embed` prop or wrap a child in a
// component that triggers the load on mount.

import React, { lazy } from "react";

import { WsAdapter } from "../core/WsAdapter";
import {
  SchematicProvider as BareSchematicProvider,
  type SchematicAdapter,
  type SchematicProviderProps as BareSchematicProviderProps,
} from "../provider";

// === Root-entry surface re-exports ===

export { SchematicContext, type SchematicContextValue } from "../context";
export type { SchematicAdapter, SchematicProviderProps } from "../provider";
export {
  useSchematic,
  useSchematicContext,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  type SchematicHookOpts,
  type UseSchematicFlagOpts,
  type UseSchematicPlanOpts,
} from "../core/hooks";
export {
  RuleType,
  Schematic,
  TrialStatus,
  UsagePeriod,
} from "@schematichq/schematic-js";
export type {
  CheckFlagReturn,
  CheckPlanReturn,
  Event,
  EventBody,
  EventBodyIdentify,
  EventBodyTrack,
  EventType,
  Keys,
  SchematicOptions,
  StoragePersister,
  Traits,
} from "@schematichq/schematic-js";

// === Embed-side type re-exports (no runtime imports) ===

export type { EmbedContextValue } from "./embed/EmbedAdapter";
export type {
  BypassConfig,
  CheckoutState,
  EmbedLayout,
  EmbedSettings,
  EmbedState,
} from "./embed/embedState";

// === Hooks (no styled-components reach) ===

export * from "./hooks";

// === Lazy-wrapped UI components ===
//
// Each component's value lives behind a dynamic `import()`. Types are
// re-exported eagerly (compile-time only — no runtime cost). When the
// consumer first mounts one of these, esbuild's chunk for that component
// loads, and (via shared chunks) styled-components is loaded with it.

export const PricingTable = lazy(() =>
  import("./components/elements/pricing-table/PricingTable").then((m) => ({
    default: m.PricingTable,
  })),
);
export type {
  PricingTableOptions,
  PricingTableProps,
} from "./components/elements/pricing-table/PricingTable";

export const PaymentMethod = lazy(() =>
  import("./components/elements/payment-method/PaymentMethod").then((m) => ({
    default: m.PaymentMethod,
  })),
);
export type { PaymentMethodProps } from "./components/elements/payment-method/PaymentMethod";

export const PaymentMethodDetails = lazy(() =>
  import("./components/elements/payment-method/PaymentMethodDetails").then(
    (m) => ({
      default: m.PaymentMethodDetails,
    }),
  ),
);

export const PlanManager = lazy(() =>
  import("./components/elements/plan-manager/PlanManager").then((m) => ({
    default: m.PlanManager,
  })),
);
export type { PlanManagerProps } from "./components/elements/plan-manager/PlanManager";

export const IncludedFeatures = lazy(() =>
  import("./components/elements/included-features/IncludedFeatures").then(
    (m) => ({
      default: m.IncludedFeatures,
    }),
  ),
);
export type { IncludedFeaturesProps } from "./components/elements/included-features/IncludedFeatures";

export const MeteredFeatures = lazy(() =>
  import("./components/elements/metered-features/MeteredFeatures").then(
    (m) => ({
      default: m.MeteredFeatures,
    }),
  ),
);
export type { MeteredFeaturesProps } from "./components/elements/metered-features/MeteredFeatures";

export const Invoices = lazy(() =>
  import("./components/elements/invoices/Invoices").then((m) => ({
    default: m.Invoices,
  })),
);
export type { InvoicesProps } from "./components/elements/invoices/Invoices";

export const UnsubscribeButton = lazy(() =>
  import("./components/elements/unsubscribe-button/UnsubscribeButton").then(
    (m) => ({
      default: m.UnsubscribeButton,
    }),
  ),
);
export type { UnsubscribeButtonProps } from "./components/elements/unsubscribe-button/UnsubscribeButton";

export const UpcomingBill = lazy(() =>
  import("./components/elements/upcoming-bill/UpcomingBill").then((m) => ({
    default: m.UpcomingBill,
  })),
);
export type { UpcomingBillProps } from "./components/elements/upcoming-bill/UpcomingBill";

export const SchematicEmbed = lazy(() =>
  import("./components/embed/Embed").then((m) => ({
    default: m.SchematicEmbed,
  })),
);
export type { EmbedProps } from "./components/embed/Embed";

export const CheckoutDialog = lazy(() =>
  import("./components/shared/checkout-dialog/CheckoutDialog").then((m) => ({
    default: m.CheckoutDialog,
  })),
);
export type { CheckoutStage } from "./components/shared/checkout-dialog/CheckoutDialog";

// === EmbedAdapter (opt-in eager binding) ===
//
// Lazy-wrapped re-export of the embed adapter. Pass it as `embed={EmbedAdapter}`
// to `SchematicProvider` to start loading the adapter chunk on provider mount
// instead of on first `useEmbed` call. Still ships out of the /components
// main bundle — the chunk loads asynchronously via React.lazy regardless of
// when it's referenced. Cast preserves the original component type for
// consumer ergonomics (the runtime is a `LazyExoticComponent` but it
// renders identically as a JSX tag and is assignable to `SchematicAdapter`).

export const EmbedAdapter = lazy(() =>
  import("./embed/EmbedAdapter").then((m) => ({ default: m.EmbedAdapter })),
) as unknown as SchematicAdapter;

// === SchematicProvider ===
//
// Pre-binds the WS adapter (so flag/entitlement hooks work out of the box)
// but NOT the embed adapter — that loads on demand via the lazy embed-loader
// the first time `useEmbed` (or one of the lazy components above) fires.
// This is the change that keeps styled-components out of the main bundle.
// To force eager embed binding, supply a custom `embed` prop — most commonly
// the lazy `EmbedAdapter` re-exported above.
const SchematicProvider: React.FC<BareSchematicProviderProps> = ({
  ws,
  ...props
}) => (
  <BareSchematicProvider
    ws={ws === undefined ? WsAdapter : ws}
    {...(props as BareSchematicProviderProps)}
  />
);
SchematicProvider.displayName = "SchematicProvider";

export { SchematicProvider };
