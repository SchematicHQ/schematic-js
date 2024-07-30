import { useContext } from "react";
import { EmbedContext } from "../context";

export const useEmbed = () => useContext(EmbedContext);
