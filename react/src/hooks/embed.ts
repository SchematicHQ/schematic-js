import { useContext } from "react";
import { EmbedContext } from "../context";

export const useSchematicEmbed = () => useContext(EmbedContext);
