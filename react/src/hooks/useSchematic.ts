import { useContext } from "react";

import { SchematicContext } from "../context";

export const useSchematic = () => {
  const context = useContext(SchematicContext);

  if (context === null) {
    throw new Error("`useSchematic` must be used within a `SchematicProvider`");
  }

  return context;
};
