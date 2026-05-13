import { useContext } from "react";

import { SchematicContext } from "../../context";
import type { EmbedContextValue } from "../embed/EmbedAdapter";

export const useEmbed = (): EmbedContextValue => {
  const ctx = useContext(SchematicContext);
  if (!ctx.embed) {
    throw new Error(
      "useEmbed: no embed adapter is mounted. Import SchematicProvider from " +
        "`@schematichq/schematic-react/components` (not the root entry), or " +
        "supply `embed={EmbedAdapter}` to the bare provider yourself.",
    );
  }
  return ctx.embed as EmbedContextValue;
};
