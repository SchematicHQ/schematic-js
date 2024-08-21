import { type ConfigurationParameters } from "../../api";
import { EmbedProvider } from "../../context";
import { ComponentTree } from "./ComponentTree";

export interface EmbedProps {
  accessToken?: string;
  id?: string;
  apiConfig?: ConfigurationParameters;
}

export const SchematicEmbed = ({ id, accessToken, apiConfig }: EmbedProps) => {
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
    <EmbedProvider id={id} accessToken={accessToken} apiConfig={apiConfig}>
      <ComponentTree />
    </EmbedProvider>
  );
};
