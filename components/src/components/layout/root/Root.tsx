import { forwardRef } from "react";

import { type EmbedSettings } from "../../../context";
import type { HydrateDataWithCompanyContext } from "../../../types";

import { Container, ContainerStyle, ResetStyle } from "./styles";

export { Container, ContainerStyle, ResetStyle };

export interface RootProps extends Omit<
  React.HTMLProps<HTMLDivElement>,
  "data"
> {
  data?: HydrateDataWithCompanyContext;
  settings?: EmbedSettings;
}

export const Root = forwardRef<HTMLDivElement | null, RootProps>(
  ({ data, settings, ...props }, ref) => {
    return <Container ref={ref} {...props} />;
  },
);

Root.displayName = "Root";
