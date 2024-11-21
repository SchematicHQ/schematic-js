import { useCallback } from "react";
import { useTheme } from "styled-components";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Box, Flex, Icon } from "../../ui";

interface ModalHeaderProps {
  children?: React.ReactNode;
  bordered?: boolean;
  onClose?: () => void;
}

export const ModalHeader = ({
  children,
  bordered = false,
  onClose,
}: ModalHeaderProps) => {
  const theme = useTheme();

  const { setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  return (
    <Flex
      $position="sticky"
      $top={0}
      $left={0}
      $zIndex={1}
      $justifyContent={children ? "space-between" : "end"}
      $alignItems="center"
      $flexShrink={0}
      $gap="1rem"
      $height="3.5rem"
      $padding="0 1rem"
      $backgroundColor={theme.card.background}
      {...(bordered && {
        $borderBottomWidth: "1px",
        $borderBottomStyle: "solid",
        $borderBottomColor: isLightBackground
          ? "hsla(0, 0%, 0%, 0.15)"
          : "hsla(0, 0%, 100%, 0.15)",
      })}
      $viewport={{
        md: {
          $height: "5rem",
          $padding: "0 1.5rem 0 3rem",
        },
      }}
    >
      {children}

      <Box $cursor="pointer" onClick={handleClose}>
        <Icon
          name="close"
          style={{
            fontSize: 36,
            color: isLightBackground
              ? "hsla(0, 0%, 0%, 0.275)"
              : "hsla(0, 0%, 100%, 0.275)",
          }}
        />
      </Box>
    </Flex>
  );
};
