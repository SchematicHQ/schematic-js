import { forwardRef } from "react";
import { StyledCard, Element } from "./styles";

export { StyledCard, Element };

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

    return (
      <StyledCard ref={ref} className={className}>
        {children}
      </StyledCard>
    );
  },
);

Card.displayName = "Card";
