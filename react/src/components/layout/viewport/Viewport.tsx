import { forwardRef } from "react";
import { useEmbed } from "../../../hooks";
import { StyledViewport } from "./styles";

export interface ViewportProps {
  children?: React.ReactNode;
  className?: string;
}

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  ({ children, className }, ref) => {
    const { settings } = useEmbed();

    return (
      <StyledViewport
        ref={ref}
        className={className}
        $numberOfColumns={settings.theme.numberOfColumns}
      >
        {children}
      </StyledViewport>
    );
  },
);
