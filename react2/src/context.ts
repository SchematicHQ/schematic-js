import type * as SchematicJS from "@schematichq/schematic-js";
import { createContext } from "react";

/**
 * Opaque marker for the embed-side surface that `SchematicProvider` may
 * expose. The shape lives in `@schematichq/schematic-react2/components`;
 * keeping the type abstract here is what allows the /core bundle to skip
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
 * Default value: both fields are `null`. The provider always sets `client`;
 * `embed` stays `null` unless an embed adapter is wired up (which happens
 * automatically when the provider is imported from
 * `@schematichq/schematic-react2/components`).
 */
export const SchematicContext = createContext<SchematicContextValue>({
  client: null,
  embed: null,
});
