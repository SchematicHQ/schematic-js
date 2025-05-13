import { inflate } from "pako";
import { useEffect, useState } from "react";
import { useTheme } from "styled-components";

import { TEXT_BASE_SIZE } from "../../const";
import { useEmbed } from "../../hooks";
import type { SerializedNodeWithChildren } from "../../types";
import { isCheckoutData, isError } from "../../utils";
import { Box, Flex, Loader } from "../ui";
import { createRenderer, getEditorState, parseEditorState } from "./renderer";

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

export interface EmbedProps {
  id?: string;
  accessToken?: string;
}

export const SchematicEmbed = ({ id, accessToken }: EmbedProps) => {
  const [children, setChildren] = useState<React.ReactNode>(<Loading />);

  const {
    data,
    error,
    isPending,
    stale,
    hydrateComponent,
    setError,
    setAccessToken,
    setSettings,
  } = useEmbed();

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
  }, [accessToken, setAccessToken]);

  useEffect(() => {
    if (id && stale) {
      hydrateComponent(id);
    }
  }, [id, hydrateComponent, stale]);

  useEffect(() => {
    const renderer = createRenderer();

    try {
      if (isCheckoutData(data) && data.component?.ast) {
        const nodes: SerializedNodeWithChildren[] = [];
        const compressed = data.component.ast;
        // `inflate` is not guaranteed to return a string
        const json: string | undefined = inflate(
          Uint8Array.from(Object.values(compressed)),
          { to: "string" },
        );
        const ast = getEditorState(json);
        if (ast) {
          setSettings({ ...ast.ROOT.props.settings });
          nodes.push(...parseEditorState(ast));
          setChildren(nodes.map(renderer));
        }
      }
    } catch (err) {
      if (isError(err)) {
        setError(err);
      }
    }
  }, [data, setSettings, setError]);

  if (error) {
    return <Error message={error.message} />;
  }

  if (accessToken?.length === 0) {
    return <Error message="Please provide an access token." />;
  }

  if (!accessToken?.startsWith("token_")) {
    return (
      <Error
        message={
          'Invalid access token; your temporary access token will start with "token_".'
        }
      />
    );
  }

  if (isPending) {
    return <Loading />;
  }

  return <>{children}</>;
};
