import { useEffect, useState } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../hooks";
import { Box, Flex, IconRound, Text } from "../ui";
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

const Success = () => {
  const theme = useTheme();
  const { hydrate, data, api, setLayout, isPending } = useEmbed();

  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    if (api && data.component?.id) {
      hydrate();
      setTimeout(() => setIsOpen(false), 2000);
    }
  }, [api, data.component?.id, hydrate]);

  useEffect(() => {
    if (!isPending && !isOpen) {
      setLayout("portal");
    }
  }, [isPending, isOpen, setLayout]);

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
          <Box $marginBottom="1.5rem">
            <IconRound
              name="check"
              size="3xl"
              colors={[theme.card.background, theme.primary]}
            />
          </Box>

          <Box $marginBottom="0.5rem">
            <Text
              as="h1"
              $font={theme.typography.heading1.fontFamily}
              $size={theme.typography.heading1.fontSize}
              $weight={theme.typography.heading1.fontWeight}
              $color={theme.typography.heading1.color}
            >
              Subscription updated!
            </Text>
          </Box>

          <Text
            as="p"
            $font={theme.typography.text.fontFamily}
            $size={theme.typography.text.fontSize}
            $weight={theme.typography.text.fontWeight}
            $color={theme.typography.text.color}
          >
            Loading…
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
  const { layout } = useEmbed();

  switch (layout) {
    case "disabled":
      return <Disabled />;
    case "success":
      return <Success />;
    default:
      return children;
  }
};
