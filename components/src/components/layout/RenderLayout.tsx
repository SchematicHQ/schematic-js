import { useTheme } from "styled-components";

import { useComponent } from "../../hooks";
import { Box, Flex, Text } from "../ui";
import { Card, Element } from ".";

const Disabled = () => {
  const theme = useTheme();

  return (
    <Box $width="max-content" $height="max-content" $margin="0 auto">
      <Card>
        <Element
          as={Flex}
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
        </Element>
      </Card>
    </Box>
  );
};

interface RenderLayoutProps {
  children: React.ReactNode;
}

export const RenderLayout = ({ children }: RenderLayoutProps) => {
  const { layout } = useComponent();

  switch (layout) {
    case "disabled":
      return <Disabled />;
    default:
      return children;
  }
};
