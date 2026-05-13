import { forwardRef } from "react";

import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import { hsla } from "../../../utils";
import { Flex, Loader } from "../../ui";

import {
  Element,
  FussyChild,
  Notice,
  StyledCard,
  cardBoxShadow,
} from "./styles";

export { Element, FussyChild, Notice, StyledCard, cardBoxShadow };

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement | null, CardProps>(
  ({ children, className }, ref) => {
    const { settings, isPending } = useEmbed();

    return (
      <StyledCard ref={ref} className={className}>
        {isPending && (
          <Flex
            $position="absolute"
            $top={0}
            $left={0}
            $zIndex={1}
            $width="100%"
            $height="100%"
            $justifyContent="center"
            $alignItems="center"
            $backgroundColor={hsla(settings.theme.card.background, 0.8)}
            $backdropFilter="blur(8px)"
            $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
          >
            <Loader $color={settings.theme.primary} />
          </Flex>
        )}

        {children}
      </StyledCard>
    );
  },
);

Card.displayName = "Card";
