import { forwardRef } from "react";
import { useTheme } from "styled-components";
import { Badge } from "../../ui/badge";
import { RenderLayout } from "../RenderLayout";
import { StyledViewport } from "./styles";

/* eslint-disable-next-line @typescript-eslint/no-empty-object-type */
export interface ViewportProps extends React.HTMLProps<HTMLDivElement> {}

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  ({ children, ...props }, ref) => {
    const theme = useTheme();

    return (
      <StyledViewport
        ref={ref}
        $numberOfColumns={theme.numberOfColumns}
        {...props}
      >
        <RenderLayout>
          {children}
          <Badge />
        </RenderLayout>
      </StyledViewport>
    );
  },
);

Viewport.displayName = "Viewport";
