import * as SchematicJS from "@schematichq/schematic-js";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";

export interface SchematicFlags {
  [key: string]: boolean;
}

interface SchematicProviderProps {
  children: ReactNode;
  publishableKey?: string;
}

interface SchematicContextProps {
  client?: SchematicJS.Schematic;
  flagValues: Record<string, boolean>;
}

const SchematicContext = createContext<SchematicContextProps>({
  flagValues: {},
});

const SchematicProvider: React.FC<SchematicProviderProps> = ({
  publishableKey,
  children,
}) => {
  const [client, setClient] = useState<SchematicJS.Schematic | undefined>();
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (publishableKey === undefined) {
      return;
    }

    const client = new SchematicJS.Schematic(publishableKey, {
      flagListener: setFlagValues,
      useWebSocket: true,
    });
    setClient(client);
    return client.cleanup;
  }, [publishableKey]);

  const contextValue: SchematicContextProps = {
    client,
    flagValues,
  };

  return (
    <SchematicContext.Provider value={contextValue}>
      {children}
    </SchematicContext.Provider>
  );
};

const useSchematic = () => useContext(SchematicContext);

const useSchematicContext = () => {
  const { client } = useSchematic();
  const { setContext } = client ?? {};

  return { setContext };
};

const useSchematicEvents = () => {
  const { client } = useSchematic();
  const { track, identify } = client ?? {};

  return { track, identify };
};

const useSchematicFlag = (key: string, fallback?: boolean) => {
  const { flagValues } = useSchematic();
  const [value, setValue] = useState(fallback ?? false);

  useEffect(() => {
    typeof flagValues[key] === "undefined"
      ? setValue(fallback ?? false)
      : setValue(flagValues[key]);
  }, [key, fallback, flagValues[key]]);

  return value;
};

export {
  SchematicProvider,
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
};
