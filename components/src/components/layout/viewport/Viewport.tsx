import { forwardRef, useMemo } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { Disabled } from "./Disabled";
import { Success } from "./Success";
import { StyledViewport } from "./styles";

export type ViewportProps = React.HTMLProps<HTMLDivElement>;

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  ({ children, ...props }, ref) => {
    const theme = useTheme();

    const { layout } = useEmbed();

    const renderedChildren = useMemo(() => {
      switch (layout) {
        case "disabled":
          return <Disabled />;
        case "success":
          return <Success />;
        default:
          return children;
      }
    }, [layout, children]);

    return (
      <StyledViewport
        ref={ref}
        $numberOfColumns={theme.numberOfColumns}
        {...props}
      >
        {renderedChildren}
      </StyledViewport>
    );
  },
);
