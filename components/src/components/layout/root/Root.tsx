import { forwardRef } from "react";

import { type ComponentHydrateResponseData } from "../../../api/checkoutexternal";
import { type EmbedSettings } from "../../../context";

import { Container } from "./styles";

export { Container };

export interface RootProps
  extends Omit<React.HTMLProps<HTMLDivElement>, "data"> {
  data?: ComponentHydrateResponseData;
  settings?: EmbedSettings;
}

export const Root = forwardRef<HTMLDivElement | null, RootProps>(
  ({ data, settings, ...props }, ref) => {
    return <Container ref={ref} {...props} />;
  },
);

Root.displayName = "Root";
