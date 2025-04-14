import { forwardRef } from "react";

import type { ComponentHydrateResponseData } from "../../../api";
import { type ComponentSettings } from "../../../context";
import { Container } from "./styles";

export { Container };

export interface RootProps
  extends Omit<React.HTMLProps<HTMLDivElement>, "data"> {
  data?: ComponentHydrateResponseData;
  settings?: ComponentSettings;
}

export const Root = forwardRef<HTMLDivElement | null, RootProps>(
  ({ data, settings, ...props }, ref) => {
    return <Container ref={ref} {...props} />;
  },
);

Root.displayName = "Root";
