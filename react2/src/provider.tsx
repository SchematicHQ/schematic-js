import type * as SchematicJS from "@schematichq/schematic-js";
import React from "react";

type CoreOptions = Omit<
  SchematicJS.SchematicOptions,
  "client" | "publishableKey" | "useWebSocket"
>;

/**
 * Loose prop shape for plugin adapters. The bare provider passes all of its
 * props through to each mounted adapter; each adapter destructures what it
 * needs. Types are deliberately loose here so `src/provider.tsx` pulls in
 * zero adapter-side dependencies — the typed wrappers in
 * `@schematichq/schematic-react2` (/core) and
 * `@schematichq/schematic-react2/components` sharpen them at the boundary.
 */
interface AdapterProps {
  // WS-side
  publishableKey?: string;
  client?: SchematicJS.Schematic;
  // Embed-side
  apiConfig?: unknown;
  settings?: unknown;
  debug?: boolean;
  currencyFilter?: string[];
}

/**
 * A `SchematicProvider` plugin adapter. Wraps `children` and re-provides
 * `SchematicContext` with the slot it owns (WS `client`, or embed surface).
 *
 * Two implementations ship with this package:
 *   * `WsAdapter` — `@schematichq/schematic-react2/core` (auto-bound via the
 *     root entry's `SchematicProvider`)
 *   * `EmbedAdapter` — `@schematichq/schematic-react2/components` (auto-bound
 *     via that entry's `SchematicProvider`)
 *
 * You can also write your own — anything that satisfies this shape works.
 */
export type SchematicAdapter = React.ComponentType<
  AdapterProps & { children: React.ReactNode }
>;

/**
 * Props accepted by `SchematicProvider`. The shape is intentionally flat
 * (no discriminated union on `ws` vs `client`/`publishableKey`) so the
 * wrapper functions in /core and /components can forward the `ws` slot
 * cleanly. Combinations the runtime expects:
 *
 *   * WS active (default): pass `publishableKey` xor `client`.
 *   * WS disabled: pass `ws={null}`. `publishableKey` and `client` are
 *     ignored. UI surface still works if the `embed` slot is bound.
 *
 * If WS is active but neither `publishableKey` nor `client` is provided,
 * `WsAdapter` throws at construction with a clear error message.
 */
export type SchematicProviderProps = {
  children: React.ReactNode;
  ws?: SchematicAdapter | null;
  embed?: SchematicAdapter | null;
  publishableKey?: string;
  client?: SchematicJS.Schematic;
  apiConfig?: unknown;
  settings?: unknown;
  debug?: boolean;
  currencyFilter?: string[];
} & CoreOptions;

/**
 * The bare Schematic provider — a pure plugin host. Composes the `ws` and
 * `embed` adapter slots (each optional) around `children` and forwards
 * every other prop to both adapters. Each adapter destructures what it
 * needs and ignores the rest.
 *
 * This component does no React state, no effects, no side effects of its
 * own — it only orchestrates the adapters.
 *
 * The /core and /components subpath entries each export a thin wrapper
 * named `SchematicProvider` that pre-binds the appropriate adapters:
 *   * /core: `ws={WsAdapter}`
 *   * /components: `ws={WsAdapter}, embed={EmbedAdapter}`
 *
 * In both wrappers, pass `ws={null}` to opt out of the WS adapter (UI-only
 * mode), or pass `ws={MyAdapter}` to swap in a custom implementation.
 */
export const SchematicProvider: React.FC<SchematicProviderProps> = ({
  children,
  ws: Ws,
  embed: Embed,
  ...props
}) => {
  let tree: React.ReactNode = children;
  if (Embed) {
    tree = <Embed {...props}>{tree}</Embed>;
  }
  if (Ws) {
    tree = <Ws {...props}>{tree}</Ws>;
  }
  return <>{tree}</>;
};
