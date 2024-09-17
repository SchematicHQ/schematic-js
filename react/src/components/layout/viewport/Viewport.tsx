import { forwardRef } from "react";
import { useTheme } from "styled-components";
import { StyledViewport } from "./styles";
import { RenderLayout } from "../RenderLayout";

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
        <RenderLayout>{children}</RenderLayout>
      </StyledViewport>
    );
  },
);
