import { useContext } from "react";

import { SchematicContext } from "../../context";
import {
  SchematicEmbedDisabledContext,
  loadEmbedAdapter,
} from "../../embed-loader";
import type { EmbedContextValue } from "../embed/EmbedAdapter";

/**
 * Returns the embed surface from `SchematicContext`. If no embed adapter is
 * mounted yet (the default — neither entry's `SchematicProvider` wrapper
 * pre-binds one), this hook kicks off the lazy adapter import and throws
 * the resulting promise. The Suspense boundary inside the bare provider
 * catches the throw and re-renders once the chunk has loaded; the
 * suspended component then retries inside the populated context.
 *
 * If the consumer wants the embed surface mounted eagerly, they should
 * pass `embed={EmbedAdapter}` to `SchematicProvider` (the lazy-wrapped
 * `EmbedAdapter` is exported from `@schematichq/schematic-react/components`).
 *
 * If the consumer explicitly opted out with `embed={null}`, the provider
 * never re-mounts an adapter, so throwing the load promise would loop
 * forever. The `SchematicEmbedDisabledContext` signal lets us short-circuit
 * to a clear error in that case.
 */
export const useEmbed = (): EmbedContextValue => {
  const ctx = useContext(SchematicContext);
  const embedDisabled = useContext(SchematicEmbedDisabledContext);
  if (!ctx.embed) {
    if (embedDisabled) {
      throw new Error(
        "useEmbed() called inside a <SchematicProvider embed={null}> tree. " +
          "The embed adapter is explicitly disabled; remove embed={null} or " +
          "move this component outside the opt-out boundary.",
      );
    }
    throw loadEmbedAdapter();
  }
  return ctx.embed as EmbedContextValue;
};
