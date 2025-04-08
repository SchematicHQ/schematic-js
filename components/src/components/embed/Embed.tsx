import { type ConfigurationParameters } from "../../api";
import { EmbedProvider } from "../../context";
import { ComponentTree } from "./ComponentTree";

export interface EmbedProps {
  accessToken?: string;
  id?: string;
  apiConfig?: ConfigurationParameters;
  debug?: boolean;
}

export const SchematicEmbed = ({
  id,
  accessToken,
  apiConfig,
  debug,
}: EmbedProps) => {
  return (
    <EmbedProvider
      id={id}
      accessToken={accessToken}
      apiConfig={apiConfig}
      debug={debug}
    >
      <ComponentTree />
    </EmbedProvider>
  );
};
