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
// first embed render), pass `embed={EmbedAdapter}` to `SchematicProvider`;
// the export below is a thin FC that wraps the chunk-split lazy ref.

// The shared-core import below (`@schematichq/schematic-react`) is a
// self-package reference, NOT a relative path. The esbuild config for this
// /components bundle marks `@schematichq/schematic-react` as external, so
// at runtime the import resolves to the same module instance the root entry
// exports. Without this, both subpath bundles inline their own copy of
// `SchematicContext`/hooks/`WsAdapter`, and a consumer mixing imports from
// both entries trips a dual-package hazard: `useSchematic` (root) reads a
// different React context than the one `SchematicProvider` (/components)
// writes through `WsAdapter`. See SCHY-372.
import React, { createElement, lazy } from "react";

import {
  type SchematicAdapter,
  type SchematicAdapterProps,
} from "@schematichq/schematic-react";

// === Root-entry surface re-exports ===
//
// `SchematicProvider` / `SchematicProviderProps` are re-exported straight
// from the root entry — the root type already includes the embed-adapter
// props (`apiConfig`, `settings`, `currencyFilter`, `debug`) typed against
// the `/components` subtree via `import type`, so there's nothing for this
// entry to add. Runtime behavior is identical.

export {
  SchematicContext,
  SchematicProvider,
  WsAdapter,
  useSchematic,
  useSchematicContext,
  useSchematicEntitlement,
  useSchematicEvents,
  useSchematicFlag,
  useSchematicIsPending,
  useSchematicPlan,
  type SchematicAdapter,
  type SchematicAdapterProps,
  type SchematicContextValue,
  type SchematicHookOpts,
  type SchematicProviderBaseProps,
  type SchematicProviderProps,
  type UseSchematicFlagOpts,
  type UseSchematicPlanOpts,
  type WsAdapterProps,
} from "@schematichq/schematic-react";
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
// A thin function-component wrapper around the chunk-split lazy ref. The
// indirection lets `EmbedAdapter` be typed as a plain `SchematicAdapter`
// (no `LazyExoticComponent` cast on the export site), while preserving the
// dynamic-import seam that keeps the heavy embed implementation out of the
// /components main bundle. Pass it as `embed={EmbedAdapter}` to
// `SchematicProvider` to start the chunk loading on provider mount instead
// of on first `useEmbed` call.

const InternalLazyEmbedAdapter = lazy(() =>
  import("./embed/EmbedAdapter").then((m) => ({ default: m.EmbedAdapter })),
);

export const EmbedAdapter: SchematicAdapter = (props: SchematicAdapterProps) =>
  createElement(InternalLazyEmbedAdapter, props);
(EmbedAdapter as React.FC).displayName = "EmbedAdapter";
