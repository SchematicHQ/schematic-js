import { forwardRef } from "react";
import type { ComponentHydrateResponseData } from "../../../api";
import { type EmbedSettings } from "../../../context";

export interface RootProps
  extends Omit<React.HTMLProps<HTMLDivElement>, "data"> {
  data?: ComponentHydrateResponseData;
  settings?: EmbedSettings;
}

export const Root = forwardRef<HTMLDivElement | null, RootProps>(
  ({ data, settings, ...props }, ref) => {
    return <div ref={ref} {...props} />;
  },
);

Root.displayName = "Root";
