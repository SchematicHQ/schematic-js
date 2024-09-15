import { useCallback } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { lighten, darken, hexToHSL } from "../../../utils";
import { Box, Flex, Icon } from "../";

interface ModalHeaderProps {
  children: React.ReactNode;
  onClose?: () => void;
}

export const ModalHeader = ({ children, onClose }: ModalHeaderProps) => {
  const theme = useTheme();
  const { setLayout } = useEmbed();

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  return (
    <Flex
      $justifyContent="space-between"
      $alignItems="center"
      $gap="1rem"
      $height="5rem"
      $padding="0 1.5rem 0 3rem"
      $backgroundColor={theme.card.background}
      $borderBottomWidth="1px"
      $borderBottomStyle="solid"
      $borderBottomColor={
        hexToHSL(theme.card.background).l > 50
          ? darken(theme.card.background, 15)
          : lighten(theme.card.background, 15)
      }
    >
      {children}

      <Box $cursor="pointer" onClick={handleClose}>
        <Icon
          name="close"
          style={{
            fontSize: 36,
            color:
              hexToHSL(theme.card.background).l > 50
                ? darken(theme.card.background, 27.5)
                : lighten(theme.card.background, 27.5),
          }}
        />
      </Box>
    </Flex>
  );
};
