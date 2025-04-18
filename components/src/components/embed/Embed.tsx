import { type ConfigurationParameters } from "../../api/checkoutexternal";
import { EmbedProvider } from "../../context";
import { ComponentTree } from "./ComponentTree";

export interface EmbedProps {
  id?: string;
  accessToken?: string;
  apiConfig?: ConfigurationParameters;
  debug?: boolean;
}

export const SchematicEmbed = ({
  id,
  accessToken,
  apiConfig,
  debug,
}: EmbedProps) => {
  if (accessToken?.length === 0) {
    return <div>Please provide an access token.</div>;
  }

  if (!accessToken?.startsWith("token_")) {
    return (
      <div>
        Invalid access token; your temporary access token will start with
        "token_".
      </div>
    );
  }

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
