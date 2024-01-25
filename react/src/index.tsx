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
  publishableKey: string;
}

interface SchematicContextProps {
  client?: SchematicJS.Schematic;
}

const SchematicContext = createContext<SchematicContextProps>({});

const useSchematicContext = () => {
  const { client } = useSchematic();
  const { setContext } = client ?? {};

  return { setContext };
}

const useSchematicEvents = () => {
  const { client } = useSchematic();
  const { track, identify } = client ?? {};

  return { track, identify };
};

const useSchematicFlag = (key: string, fallback?: boolean) => {
  const { client } = useSchematic();
  const { checkFlag } = client ?? {};
  const [value, setValue] = useState(fallback ?? false);

  useEffect(() => {
    if (!checkFlag) {
      setValue(fallback ?? false);
      return;
    }

    checkFlag({ key, fallback }).then((result) => {
      setValue(result);
    });
  }, [key, fallback, checkFlag]);

  return value;
};

const SchematicProvider: React.FC<SchematicProviderProps> = ({ publishableKey, children }) => {
  const [client, setClient] = useState<SchematicJS.Schematic | undefined>();

  useEffect(() => {
    const client = new SchematicJS.Schematic(publishableKey, {
      useWebSocket: true,
    });
    setClient(client);
    return client.cleanup;
  }, [publishableKey]);

  const contextValue: SchematicContextProps = {
    client,
  };

  return (
    <SchematicContext.Provider value={contextValue}>
      {children}
    </SchematicContext.Provider>
  );
};

const useSchematic = () => useContext(SchematicContext);

export { SchematicProvider, useSchematic, useSchematicContext, useSchematicEvents, useSchematicFlag };
