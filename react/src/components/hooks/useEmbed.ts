import { useContext } from "react";

import { SchematicContext } from "../../context";
import { loadEmbedAdapter } from "../../embed-loader";
import type { EmbedContextValue } from "../embed/EmbedAdapter";

/**
 * Returns the embed surface from `SchematicContext`. If no embed adapter is
 * mounted yet (the default — neither entry's `SchematicProvider` wrapper
 * pre-binds one), this hook kicks off the lazy adapter import and throws
 * the resulting promise. The nearest Suspense boundary — including the one
 * inside the bare provider itself — catches the throw, and the provider
 * re-renders to mount the adapter once the chunk has loaded. The component
 * then retries inside the populated context.
 *
 * If the consumer wants the embed surface mounted eagerly, they should
 * pass `embed={EmbedAdapter}` to `SchematicProvider` (the lazy-wrapped
 * `EmbedAdapter` is exported from `@schematichq/schematic-react/components`).
 */
export const useEmbed = (): EmbedContextValue => {
  const ctx = useContext(SchematicContext);
  if (!ctx.embed) {
    throw loadEmbedAdapter();
  }
  return ctx.embed as EmbedContextValue;
};
