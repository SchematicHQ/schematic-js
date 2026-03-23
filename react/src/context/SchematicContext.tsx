import { createContext } from "react";
import * as SchematicJS from "@schematichq/schematic-js";

export interface SchematicContextProps {
  client: SchematicJS.Schematic;
}

export const SchematicContext = createContext<SchematicContextProps | null>(
  null,
);
