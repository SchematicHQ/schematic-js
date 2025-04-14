import { useEffect, useState } from "react";
import { useTheme } from "styled-components";

import { TEXT_BASE_SIZE } from "../../const";
import { useComponent } from "../../hooks";
import { Box, Flex, Loader } from "../ui";
import { createRenderer } from "./renderer";

const Loading = () => {
  const theme = useTheme();
  return (
    <Flex
      $width="100%"
      $height="100%"
      $alignItems="center"
      $justifyContent="center"
      $padding={`${theme.card.padding / TEXT_BASE_SIZE}rem`}
    >
      <Loader $color="#194BFB" $size="2xl" />
    </Flex>
  );
};

const Error = ({ message }: { message: string }) => {
  const theme = useTheme();
  return (
    <Flex
      $flexDirection="column"
      $padding={`${theme.card.padding / TEXT_BASE_SIZE}rem`}
      $width="100%"
      $borderRadius={`${theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
      $backgroundColor={theme.card.background}
      $alignItems="center"
      $justifyContent="center"
    >
      <Box
        $marginBottom={`${8 / TEXT_BASE_SIZE}rem`}
        $fontSize={`${theme.typography.heading1.fontSize / TEXT_BASE_SIZE}rem`}
        $fontFamily={theme.typography.heading1.fontFamily}
        $fontWeight={theme.typography.heading1.fontWeight}
        $color={theme.typography.heading1.color}
      >
        Error
      </Box>
      <Box
        $marginBottom={`${8 / TEXT_BASE_SIZE}rem`}
        $fontSize={`${theme.typography.text.fontSize / TEXT_BASE_SIZE}rem`}
        $fontFamily={theme.typography.text.fontFamily}
        $fontWeight={theme.typography.text.fontWeight}
        $color={theme.typography.text.color}
      >
        {message}
      </Box>
    </Flex>
  );
};

export const ComponentTree = () => {
  const { error, nodes, isPending } = useComponent();

  const [children, setChildren] = useState<React.ReactNode>(<Loading />);

  useEffect(() => {
    const renderer = createRenderer();
    setChildren(nodes.map(renderer));
  }, [nodes]);

  if (error) {
    console.error(error);
    return <Error message={error.message} />;
  }

  if (isPending) {
    return <Loading />;
  }

  return <>{children}</>;
};
