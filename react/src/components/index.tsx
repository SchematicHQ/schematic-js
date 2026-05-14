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

import type * as SchematicJS from "@schematichq/schematic-js";
import React, { createElement, lazy } from "react";

import { WsAdapter } from "../core/WsAdapter";
import {
  SchematicProvider as BareSchematicProvider,
  type SchematicAdapter,
  type SchematicAdapterProps,
  type SchematicProviderBaseProps,
} from "../provider";

import type { ConfigurationParameters } from "./api/checkoutexternal";
import type { EmbedSettings } from "./embed/embedState";
import type { DeepPartial } from "./types/util";

// === Root-entry surface re-exports ===

export { SchematicContext, type SchematicContextValue } from "../context";
export type {
  SchematicAdapter,
  SchematicAdapterProps,
  SchematicProviderBaseProps,
} from "../provider";
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

// === SchematicProvider ===

type CoreOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
>;

type CommonProviderProps = {
  children: React.ReactNode;
  ws?: SchematicAdapter | null;
  embed?: SchematicAdapter | null;
  fallback?: React.ReactNode;
  apiConfig?: ConfigurationParameters;
  settings?: DeepPartial<EmbedSettings>;
  debug?: boolean;
  currencyFilter?: string[];
} & CoreOptions;

// Restored client xor publishableKey union, sharpened for the /components
// surface. apiConfig/settings/currencyFilter now have real types instead
// of `unknown`.
type WithClient = {
  client: SchematicJS.Schematic;
  publishableKey?: never;
};
type WithPublishableKey = {
  client?: never;
  publishableKey: string;
};
type WithoutWs = {
  client?: never;
  publishableKey?: string;
  ws: null;
};

export type SchematicProviderProps = CommonProviderProps &
  (WithClient | WithPublishableKey | WithoutWs);

/**
 * `SchematicProvider` for the /components entry — pre-binds the WS adapter
 * (so flag/entitlement hooks work out of the box) but NOT the embed
 * adapter. That loads on demand via the lazy embed-loader the first time
 * `useEmbed` (or one of the lazy components above) mounts.
 *
 * To force eager embed binding, pass `embed={EmbedAdapter}` (the lazy
 * wrapper exported above). To disable the embed surface entirely, pass
 * `embed={null}` — `useEmbed` will throw an explicit error from inside
 * that tree instead of looping on a Suspense throw.
 */
const SchematicProvider: React.FC<SchematicProviderProps> = (props) => {
  const { ws } = props;
  return (
    <BareSchematicProvider
      {...(props as unknown as SchematicProviderBaseProps)}
      ws={ws === undefined ? WsAdapter : ws}
    />
  );
};
SchematicProvider.displayName = "SchematicProvider";

export { SchematicProvider };
