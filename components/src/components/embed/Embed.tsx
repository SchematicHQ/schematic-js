import { inflate } from "pako";
import { useContext, useEffect, useState } from "react";
import { ThemeContext } from "styled-components";

import { TEXT_BASE_SIZE } from "../../const";
import { stub } from "../../context";
import { useEmbed } from "../../hooks";
import type { SerializedNodeWithChildren } from "../../types";
import { ERROR_UNKNOWN, isCheckoutData, isError } from "../../utils";
import { Box, Flex, Loader, Text } from "../ui";

import { createRenderer, getEditorState, parseEditorState } from "./renderer";

const Loading = () => {
  const { settings } = useEmbed();

  return (
    <Flex
      $width="100%"
      $height="100%"
      $alignItems="center"
      $justifyContent="center"
      $padding={`${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
    >
      <Loader $color="#194BFB" $size="2xl" />
    </Flex>
  );
};

const Error = ({ message }: { message: string }) => {
  const { settings } = useEmbed();

  return (
    <Flex
      $flexDirection="column"
      $padding={`${settings.theme.card.padding / TEXT_BASE_SIZE}rem`}
      $width="100%"
      $borderRadius={`${settings.theme.card.borderRadius / TEXT_BASE_SIZE}rem`}
      $backgroundColor={settings.theme.card.background}
      $alignItems="center"
      $justifyContent="center"
    >
      <Box $marginBottom="0.5rem">
        <Text display="heading1">Error</Text>
      </Box>

      <Box $marginBottom="0.5rem">
        <Text>{message}</Text>
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

  const theme = useContext(ThemeContext);

  const {
    data,
    error,
    isPending,
    stale,
    hydrateComponent,
    setError,
    setAccessToken,
    updateSettings,
  } = useEmbed();

  useEffect(() => {
    if (accessToken) {
      setAccessToken(accessToken);
    }
  }, [accessToken, setAccessToken]);

  useEffect(() => {
    if (id && stale) {
      // updates data prop (indirectly)
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
          updateSettings({ ...ast.ROOT.props.settings }, { update: false });
          nodes.push(...parseEditorState(ast));
          setChildren(nodes.map(renderer));
        }
      }
    } catch (err) {
      setError(isError(err) ? err : ERROR_UNKNOWN);
    }
  }, [data, setError, updateSettings]);

  // `EmbedProvider` provides a `ThemeContext`, therefore we need ensure that one exists.
  // If there is no `EmbedContext` available, we must check for the missing theme.
  // This will throw a missing provider error.
  if (!theme) {
    return stub();
  }

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
