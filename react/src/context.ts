import type * as SchematicJS from "@schematichq/schematic-js";
import { createContext } from "react";

/**
 * Opaque marker for the embed-side surface that `SchematicProvider` may
 * expose. The shape lives in `@schematichq/schematic-react/components`;
 * keeping the type abstract here is what allows the root bundle to skip
 * the embed-side imports entirely.
 */
export type SchematicEmbedSurface = unknown;

export interface SchematicContextValue {
  client: SchematicJS.Schematic | null;
  embed: SchematicEmbedSurface | null;
}

/**
 * The single Schematic context. Both the WS-backed flag/entitlement client
 * (`client`) and the REST-backed embed surface (`embed`) flow through this
 * context.
 *
 * Default value: both fields are `null`. The provider sets `client`
 * whenever the WS adapter is active (the default; pass `ws={null}` to
 * disable). `embed` stays `null` until an embed adapter is mounted —
 * lazily on first `useEmbed` call, or eagerly if the consumer passes
 * `embed={EmbedAdapter}` (the lazy-wrapped re-export from
 * `@schematichq/schematic-react/components`).
 */
export const SchematicContext = createContext<SchematicContextValue>({
  client: null,
  embed: null,
});
