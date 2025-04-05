import { forwardRef } from "react";
import { useTheme } from "styled-components";

import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import { hsla } from "../../../utils";
import { Flex, Loader } from "../../ui";
import {
  cardBoxShadow,
  Element,
  FussyChild,
  Notice,
  StyledCard,
} from "./styles";

export { cardBoxShadow, Element, FussyChild, Notice, StyledCard };

export interface CardProps {
  children?: React.ReactNode;
  className?: string;
}

export const Card = forwardRef<HTMLDivElement | null, CardProps>(
  ({ children, className }, ref) => {
    const { isPending } = useEmbed();

    const theme = useTheme();

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
            $backgroundColor={hsla(theme.card.background, 0.8)}
            $backdropFilter="blur(8px)"
            $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
          >
            <Loader $color={theme.primary} />
          </Flex>
        )}

        {children}
      </StyledCard>
    );
  },
);

Card.displayName = "Card";
