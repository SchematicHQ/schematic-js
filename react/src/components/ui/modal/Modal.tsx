import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { lighten, darken, hexToHSL } from "../../../utils";
import { Box, Flex } from "../";

interface ModalProps {
  children: React.ReactNode;
  size?: "md" | "lg";
  onClose?: () => void;
}

export const Modal = ({ children, onClose }: ModalProps) => {
  const theme = useTheme();
  const { setLayout } = useEmbed();

  const ref = useRef<HTMLDivElement>(null);

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Box
      ref={ref}
      tabIndex={0}
      onClick={(event) => {
        if (event.target === event.currentTarget) {
          handleClose();
        }
      }}
      onKeyDown={(event) => {
        if (event.key === "Escape") {
          handleClose();
        }
      }}
      $position="absolute"
      $top="50%"
      $left="50%"
      $zIndex="999999"
      $transform="translate(-50%, -50%)"
      $width="100%"
      $height="100%"
      $backgroundColor={
        hexToHSL(theme.card.background).l > 50
          ? darken(theme.card.background, 15)
          : lighten(theme.card.background, 15)
      }
      $overflow="hidden"
    >
      <Flex
        $position="relative"
        $top="50%"
        $left="50%"
        $transform="translate(-50%, -50%)"
        $flexDirection="column"
        $overflow="hidden"
        $width="max-content"
        $height="max-content"
        $maxWidth="100%"
        $maxHeight="100vh"
        $backgroundColor={
          hexToHSL(theme.card.background).l > 50
            ? darken(theme.card.background, 2.5)
            : lighten(theme.card.background, 2.5)
        }
        $borderRadius="0.5rem"
        $boxShadow="0px 1px 20px 0px #1018280F, 0px 1px 3px 0px #1018281A;"
        id="select-plan-dialog"
        role="dialog"
        aria-labelledby="select-plan-dialog-label"
        aria-modal="true"
      >
        {children}
      </Flex>
    </Box>
  );
};
