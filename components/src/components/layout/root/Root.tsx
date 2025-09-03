import { forwardRef } from "react";

import { type EmbedSettings } from "../../../context";
import { HydrateData } from "../../../types";

import { Container } from "./styles";

export { Container };

export interface RootProps
  extends Omit<React.HTMLProps<HTMLDivElement>, "data"> {
  data?: HydrateData;
  settings?: EmbedSettings;
}

export const Root = forwardRef<HTMLDivElement | null, RootProps>(
  ({ data, settings, ...props }, ref) => {
    return <Container ref={ref} {...props} />;
  },
);

Root.displayName = "Root";
