import { render, type RenderOptions } from "@testing-library/react";

import { SchematicProvider } from "..";
import { EmbedAdapter } from "../embed/EmbedAdapter";

// Tests render internal styled-components-based components synchronously, so
// they need `EmbedAdapter` (which provides the theme via `ThemeProvider`)
// mounted before the first render. Production /components consumers get
// `EmbedAdapter` lazily via the embed-loader (Path C); the test setup opts
// into the eager path by passing `embed={EmbedAdapter}` explicitly. Static
// import of `EmbedAdapter` here is fine because this file is never bundled
// into the shipped package — tests don't ship.
const Provided = ({ children }: { children: React.ReactNode }) => {
  return (
    <SchematicProvider embed={EmbedAdapter} publishableKey="api_0">
      {children}
    </SchematicProvider>
  );
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) =>
  render(ui, {
    wrapper: Provided,
    ...options,
  });

export { customRender as render };
