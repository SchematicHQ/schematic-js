import { InjectionToken } from "@angular/core";
import * as SchematicJS from "@schematichq/schematic-js";

export const SCHEMATIC_CLIENT = new InjectionToken<SchematicJS.Schematic>(
  "SchematicClient",
);
