import { useEmbed } from "../../hooks";
import { Box, Flex, Text } from "../ui";

import { Card, Element } from ".";

const Disabled = () => {
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
            <Text as="h1" display="heading1">
              Portal not found
            </Text>
          </Box>

          <Text as="p">Please try again later.</Text>
        </Element>
      </Card>
    </Box>
  );
};

interface RenderLayoutProps {
  children: React.ReactNode;
}

export const RenderLayout = ({ children }: RenderLayoutProps) => {
  const { layout } = useEmbed();

  switch (layout) {
    case "disabled":
      return <Disabled />;
    default:
      return children;
  }
};
