import { forwardRef } from "react";
import { useEmbed } from "../../../hooks";
import { StyledCard } from "./styles";
import { DesignSettings } from "../../../types";

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement | null, CardProps>(
  ({ children, className }: CardProps, ref) => {
    /* const transientProps = Object.entries(props).reduce((acc: React.CSSProperties, [key, value]) => {
      if (typeof value !== "undefined") {
        return { ...acc, [`$${key}`]: value };
      }

      return acc;
    }, {}); */

    const { settings } = useEmbed();

    console.log(settings.design?.typography?.heading1?.fontSize, "@@!!!");
    return (
      <StyledCard
        ref={ref}
        className={className}
        $sectionLayout={settings.sectionLayout}
        $borderRadius={settings.borderRadius}
        $borderWidth={settings.borderWidth}
        $boxPadding={settings.boxPadding}
        $design={settings.design as DesignSettings}
      >
        {children}
      </StyledCard>
    );
  },
);
