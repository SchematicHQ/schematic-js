import { render, type RenderOptions } from "@testing-library/react";

import { SchematicProvider } from "..";

const Provided = ({ children }: { children: React.ReactNode }) => {
  return (
    <SchematicProvider publishableKey="api_0">{children}</SchematicProvider>
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
