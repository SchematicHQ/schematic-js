import { ThemeProvider } from "styled-components";
import { EmbedProvider } from "../../context";
import { ComponentTree } from "./ComponentTree";
import { light, dark } from "./theme";

export interface EmbedProps {
  accessToken: string;
  id: string;
  theme?: "light" | "dark";
}

export const Embed = ({ id, accessToken, theme = "light" }: EmbedProps) => {
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
    <ThemeProvider theme={theme === "dark" ? dark : light}>
      <>
        <EmbedProvider accessToken={accessToken} id={id}>
          <ComponentTree />
        </EmbedProvider>
      </>
    </ThemeProvider>
  );
};
