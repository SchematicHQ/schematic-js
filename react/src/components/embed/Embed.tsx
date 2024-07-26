import { EmbedProvider } from "../../context";
import { ComponentTree } from "./ComponentTree";

export interface EmbedProps {
  accessToken: string;
  id: string;
  theme?: "light" | "dark";
}

export const Embed = ({ id, accessToken }: EmbedProps) => {
  if (accessToken.length === 0) {
    return <div>Please provide an access token.</div>;
  }

  if (!accessToken.startsWith("token_")) {
    return (
      <div>
        Invalid access token; your temporary access token will start with
        "token_".
      </div>
    );
  }

  return (
    <EmbedProvider accessToken={accessToken} id={id}>
      <ComponentTree />
    </EmbedProvider>
  );
};
