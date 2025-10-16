import { render, type RenderOptions } from "@testing-library/react";

import { EmbedProvider } from "..";

const Provided = ({ children }: { children: React.ReactNode }) => {
  return <EmbedProvider apiKey="api_0">{children}</EmbedProvider>;
};

const customRender = (
  ui: React.ReactElement,
  options?: Omit<RenderOptions, "wrapper">,
) =>
  render(ui, {
    wrapper: Provided,
    ...options,
  });

export * from "@testing-library/react";
export { customRender as render };
