import { forwardRef } from "react";
import { useEmbed } from "../../../hooks";
import { StyledCard } from "./styles";

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

    const { settings } = useEmbed();

    return (
      <StyledCard
        ref={ref}
        className={className}
        $sectionLayout={settings.theme?.sectionLayout}
        $borderRadius={settings.theme?.card?.borderRadius}
        $color={settings.theme?.typography?.text?.color}
      >
        {children}
      </StyledCard>
    );
  },
);
