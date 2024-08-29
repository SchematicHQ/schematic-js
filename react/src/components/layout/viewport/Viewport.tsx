import { forwardRef } from "react";
import { useEmbed } from "../../../hooks";
import { StyledViewport } from "./styles";

export interface ViewportProps extends React.HTMLProps<HTMLDivElement> {}

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  (props, ref) => {
    const { settings } = useEmbed();

    return (
      <StyledViewport
        ref={ref}
        $numberOfColumns={settings.theme.numberOfColumns}
        {...props}
      />
    );
  },
);
