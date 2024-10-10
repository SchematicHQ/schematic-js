import { forwardRef } from "react";
import { useTheme } from "styled-components";
import { StyledCard, Element } from "./styles";

export { Element };

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement | null, CardProps>(
  ({ children, className }, ref) => {
    /* const transientProps = Object.entries(props).reduce((acc: React.CSSProperties, [key, value]) => {
      if (typeof value !== "undefined") {
        return { ...acc, [`$${key}`]: value };
      }

      return acc;
    }, {}); */

    const theme = useTheme();

    return (
      <StyledCard
        ref={ref}
        className={className}
        $sectionLayout={theme?.sectionLayout}
        $borderRadius={theme?.card?.borderRadius}
        $padding={theme?.card?.padding}
        $shadow={theme?.card?.hasShadow}
      >
        {children}
      </StyledCard>
    );
  },
);

Card.displayName = "Card";
