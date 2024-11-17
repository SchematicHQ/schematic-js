import { useCallback } from "react";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Box, Flex, Icon } from "../../ui";
import { useTheme } from "styled-components";

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
      $justifyContent={children ? "space-between" : "end"}
      $alignItems="center"
      $flexShrink="0"
      $gap="1rem"
      $height="5rem"
      $padding="0 1.5rem 0 3rem"
      {...(bordered && {
        $borderBottomWidth: "1px",
        $borderBottomStyle: "solid",
        $borderBottomColor: isLightBackground
          ? "hsla(0, 0%, 0%, 0.15)"
          : "hsla(0, 0%, 100%, 0.15)",
      })}
      $viewport={{
        sm: {
          $zIndex: 1,
          $position: "sticky",
          $left: "0",
          $top: "0",
          $overflow: "hidden",
          $overflowX: "auto",
          $maxWidth: "100%",
          $height: "4rem",
          $padding: " 0 0.75rem 0 1.5rem",
          $borderRadius: "0",
          $gap: "0.16rem",
          $backgroundColor: `${theme.card.background}`,
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
