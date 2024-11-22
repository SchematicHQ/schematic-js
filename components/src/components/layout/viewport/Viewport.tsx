import { forwardRef } from "react";
import { Badge } from "../../ui/badge";
import { RenderLayout } from "../RenderLayout";
import { StyledViewport } from "./styles";

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface ViewportProps extends React.HTMLProps<HTMLDivElement> {}

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  ({ children, ...props }, ref) => {
    return (
      <>
        <StyledViewport ref={ref} {...props}>
          <RenderLayout>{children}</RenderLayout>
          <Badge />
        </StyledViewport>
      </>
    );
  },
);

Viewport.displayName = "Viewport";
