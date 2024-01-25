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
  apiUrl?: string;
}

interface SchematicContextProps {
  client?: SchematicJS.Schematic;
  flagValues: Record<string, boolean>;
}

const SchematicContext = createContext<SchematicContextProps>({
  flagValues: {},
});

const SchematicProvider: React.FC<SchematicProviderProps> = ({
  apiUrl,
  children,
  publishableKey,
}) => {
  const [client, setClient] = useState<SchematicJS.Schematic | undefined>();
  const [flagValues, setFlagValues] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (publishableKey === undefined) {
      return;
    }

    const client = new SchematicJS.Schematic(publishableKey, {
      apiUrl,
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
  const flagValue = flagValues[key];

  useEffect(() => {
    typeof flagValue === "undefined"
      ? setValue(fallback ?? false)
      : setValue(flagValue);
  }, [key, fallback, flagValue]);

  return value;
};

export {
  SchematicProvider,
  useSchematic,
  useSchematicContext,
  useSchematicEvents,
  useSchematicFlag,
};

export type {
  Event,
  EventBody,
  EventBodyCompany,
  EventBodyIdentify,
  EventBodyTrack,
  EventType,
  FlagCheckResponseBody,
  FlagCheckWithKeyResponseBody,
  Keys,
  SchematicContext,
  Traits,
} from "@schematichq/schematic-js";
