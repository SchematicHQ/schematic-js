import { forwardRef } from "react";
import { useTheme } from "styled-components";
import { TEXT_BASE_SIZE } from "../../../const";
import { useEmbed } from "../../../hooks";
import { StyledViewport } from "./styles";
import { Box, Flex } from "../../ui";

export interface ViewportProps extends React.HTMLProps<HTMLDivElement> {}

export const Viewport = forwardRef<HTMLDivElement | null, ViewportProps>(
  ({ children, ...props }, ref) => {
    const theme = useTheme();
    const { layout } = useEmbed();

    return (
      <StyledViewport
        ref={ref}
        $numberOfColumns={theme.numberOfColumns}
        {...props}
      >
        {layout === "disabled" ? (
          <Box $width="100%">
            <Flex
              $flexDirection="column"
              $padding={`${theme.card.padding / TEXT_BASE_SIZE}rem`}
              $width="100%"
              $height="auto"
              $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
              $backgroundColor={theme.card.background}
              $alignItems="center"
              $justifyContent="center"
            >
              <Box
                $marginBottom="8px"
                $fontSize={`${theme.typography.heading1.fontSize / TEXT_BASE_SIZE}rem`}
                $fontFamily={theme.typography.heading1.fontFamily}
                $fontWeight={theme.typography.heading1.fontWeight}
                $color={theme.typography.heading1.color}
              >
                Coming soon
              </Box>
              <Box
                $marginBottom="8px"
                $fontSize={`${theme.typography.text.fontSize / TEXT_BASE_SIZE}rem`}
                $fontFamily={theme.typography.text.fontFamily}
                $fontWeight={theme.typography.text.fontWeight}
                $color={theme.typography.text.color}
              >
                The plan manager will be back very soon.
              </Box>
            </Flex>
          </Box>
        ) : (
          children
        )}
      </StyledViewport>
    );
  },
);
