import { useEffect, useState } from "react";
import { useEmbed } from "../../hooks";
import { createRenderer } from "./renderer";
import { Box, Flex } from "../ui";
import { Loader } from "../ui/loader";

export const ComponentTree = () => {
  const { error, nodes, settings } = useEmbed();

  const [children, setChildren] = useState<React.ReactNode>(
    <Flex
      $width="100%"
      $height="100%"
      $alignItems="center"
      $justifyContent="center"
      $padding={`${settings.theme.card.padding / 16}rem`}
    >
      <Loader />
    </Flex>,
  );

  useEffect(() => {
    const renderer = createRenderer();
    setChildren(nodes.map(renderer));
  }, [nodes]);

  if (error) {
    return (
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
          404 Error
        </Box>
        <Box
          $marginBottom="8px"
          $fontSize={`${settings.theme.typography.text.fontSize / 16}rem`}
          $fontFamily={settings.theme.typography.text.fontFamily}
          $fontWeight={settings.theme.typography.text.fontWeight}
          $color={settings.theme.typography.text.color}
        >
          {error.message}
        </Box>
      </Flex>
    );
  }

  return <>{children}</>;
};
