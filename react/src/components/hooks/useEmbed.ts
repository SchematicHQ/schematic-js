import { useContext } from "react";

import { SchematicContext } from "../../context";
import { loadEmbedAdapter } from "../../embed-loader";
import type { EmbedContextValue } from "../embed/EmbedAdapter";

/**
 * Returns the embed surface from `SchematicContext`. If no embed adapter is
 * mounted yet (because the consumer imported `SchematicProvider` from the
 * /core entry, which does not pre-bind one), this hook kicks off the lazy
 * adapter import and throws the resulting promise. The nearest Suspense
 * boundary — including the one inside the bare provider itself — catches
 * the throw, and the provider re-renders to mount the adapter once the
 * chunk has loaded. The component then retries inside the populated
 * context.
 *
 * If the consumer wants the embed surface available eagerly, they should
 * either import `SchematicProvider` from `@schematichq/schematic-react/components`
 * (which pre-binds it) or pass `embed={EmbedAdapter}` to the bare provider
 * directly.
 */
export const useEmbed = (): EmbedContextValue => {
  const ctx = useContext(SchematicContext);
  if (!ctx.embed) {
    throw loadEmbedAdapter();
  }
  return ctx.embed as EmbedContextValue;
};
