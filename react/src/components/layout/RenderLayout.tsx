import { useState } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../hooks";
import { ReactNode, useEffect } from "react";
import { Box, Flex, IconRound, Text } from "../ui";
import { TEXT_BASE_SIZE } from "../../const";

const DisabledState = () => {
  const theme = useTheme();

  return (
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
  );
};

const SuccessState = () => {
  const [isOpen, setIsOpen] = useState(true);

  const theme = useTheme();
  const { hydrate, data, api, setLayout, isPending } = useEmbed();

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
    <Flex
      $flexDirection="column"
      $justifyContent="center"
      $alignItems="center"
      $gap={`${32 / TEXT_BASE_SIZE}rem`}
      $width="min-content"
      $height="min-content"
      $margin="auto"
      $padding={`${theme.card.padding / TEXT_BASE_SIZE}rem ${(theme.card.padding * 1.5) / TEXT_BASE_SIZE}rem`}
      $whiteSpace="nowrap"
      $backgroundColor={theme.card.background}
      $borderRadius="0.5rem"
      $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
    >
      <IconRound
        name="check"
        size="3xl"
        colors={[theme.card.background, theme.primary]}
      />
      <Text
        as="h1"
        $font={theme.typography.heading1.fontFamily}
        $size={theme.typography.heading1.fontSize}
        $weight={theme.typography.heading1.fontWeight}
        $color={theme.typography.heading1.color}
      >
        Subscription updated!
      </Text>

      <Text
        as="p"
        $font={theme.typography.text.fontFamily}
        $size={theme.typography.text.fontSize}
        $weight={theme.typography.text.fontWeight}
        $color={theme.typography.text.color}
      >
        Loading...
      </Text>
    </Flex>
  );
};

export const RenderLayout = ({ children }: { children: ReactNode }) => {
  const { layout } = useEmbed();

  switch (layout) {
    case "disabled":
      return <DisabledState />;
    case "success":
      return <SuccessState />;
    default:
      return children;
  }
};
