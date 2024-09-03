import { forwardRef } from "react";
import { useEmbed } from "../../../hooks";
import { StyledViewport } from "./styles";

export interface ViewportProps extends React.HTMLProps<HTMLDivElement> {}

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  ({ children, ...props }, ref) => {
    const { settings, layout } = useEmbed();

    return (
      <StyledViewport
        ref={ref}
        $numberOfColumns={settings.theme.numberOfColumns}
        {...props}
      >
        {layout === "disabled" ? <div className="">DISABLED</div> : children}
      </StyledViewport>
    );
  },
);
