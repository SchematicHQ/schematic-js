import { useTheme } from "styled-components";
import { Box, Flex, Text } from "../../ui";
import { Card } from "../..";

export const Disabled = () => {
  const theme = useTheme();

  return (
    <Box $width="max-content" $height="max-content" $margin="0 auto">
      <Card>
        <Flex
          $flexDirection="column"
          $justifyContent="center"
          $alignItems="center"
          $whiteSpace="nowrap"
        >
          <Box $marginBottom="0.5rem">
            <Text
              as="h1"
              $font={theme.typography.heading1.fontFamily}
              $size={theme.typography.heading1.fontSize}
              $weight={theme.typography.heading1.fontWeight}
              $color={theme.typography.heading1.color}
            >
              Portal not found
            </Text>
          </Box>

          <Text
            as="p"
            $font={theme.typography.text.fontFamily}
            $size={theme.typography.text.fontSize}
            $weight={theme.typography.text.fontWeight}
            $color={theme.typography.text.color}
          >
            Please try again later.
          </Text>
        </Flex>
      </Card>
    </Box>
  );
};
