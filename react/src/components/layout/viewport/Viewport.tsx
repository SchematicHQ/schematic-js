import { forwardRef } from "react";
import { useEmbed } from "../../../hooks";
import { StyledViewport } from "./styles";
import { Box, Flex } from "../../ui";

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
        {layout === "disabled" ? (
          <Box $width="100%">
            <Flex
              $flexDirection="column"
              $padding={`${settings.theme.card.padding / 16}rem`}
              $width="100%"
              $height="auto"
              $borderRadius={`${settings.theme.card.borderRadius / 16}rem`}
              $backgroundColor={settings.theme.card.background}
              $alignItems="center"
              $justifyContent="center"
            >
              <Box
                $marginBottom="8px"
                $fontSize={`${settings.theme.typography.heading1.fontSize / 16}rem`}
                $fontFamily={settings.theme.typography.heading1.fontFamily}
                $fontWeight={settings.theme.typography.heading1.fontWeight}
                $color={settings.theme.typography.heading1.color}
              >
                Coming soon
              </Box>
              <Box
                $marginBottom="8px"
                $fontSize={`${settings.theme.typography.text.fontSize / 16}rem`}
                $fontFamily={settings.theme.typography.text.fontFamily}
                $fontWeight={settings.theme.typography.text.fontWeight}
                $color={settings.theme.typography.text.color}
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
