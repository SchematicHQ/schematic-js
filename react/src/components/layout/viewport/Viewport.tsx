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
              $padding="6rem"
              $width="100%"
              $height="auto"
              $borderRadius=".5rem"
              $backgroundColor="#F4F4F4"
              $alignItems="center"
              $justifyContent="center"
            >
              <Box $fontSize="37px" $marginBottom="8px" $fontWeight="600">
                Coming soon
              </Box>
              <Box $fontSize="16px">
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
