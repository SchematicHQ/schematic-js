import { useCallback, useMemo } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { lighten, darken, hexToHSL } from "../../../utils";
import { Box, Flex, Icon } from "../";

interface ModalHeaderProps {
  children: React.ReactNode;
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

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  return (
    <Flex
      $justifyContent="space-between"
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
