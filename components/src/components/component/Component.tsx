import { type ConfigurationParameters } from "../../api";
import { ComponentProvider } from "../../context";
import { ComponentTree } from "./ComponentTree";

export interface ComponentProps {
  accessToken?: string;
  id?: string;
  apiConfig?: ConfigurationParameters;
  debug?: boolean;
}

export const SchematicComponent = ({
  id,
  accessToken,
  apiConfig,
  debug,
}: ComponentProps) => {
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
    <ComponentProvider
      id={id}
      accessToken={accessToken}
      apiConfig={apiConfig}
      debug={debug}
    >
      <ComponentTree />
    </ComponentProvider>
  );
};
