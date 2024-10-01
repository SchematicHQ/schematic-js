import { useCallback, useEffect, useMemo, useRef } from "react";
import { useTheme } from "styled-components";
import { useEmbed } from "../../../hooks";
import { hexToHSL } from "../../../utils";
import { Box, Flex } from "../";

interface ModalProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "auto";
  onClose?: () => void;
}

export const Modal = ({ children, size = "auto", onClose }: ModalProps) => {
  const theme = useTheme();
  const { setLayout } = useEmbed();

  const ref = useRef<HTMLDivElement>(null);

  const isLightBackground = useMemo(() => {
    return hexToHSL(theme.card.background).l > 50;
  }, [theme.card.background]);

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
        isLightBackground ? "hsla(0, 0%, 85%, 0.8)" : "hsla(0, 0%, 15%, 0.8)"
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
        {...(size === "auto"
          ? { $width: "fit-content", $height: "fit-content" }
          : {
              $width: "100%",
              ...(size === "lg"
                ? { $height: "100%" }
                : { $height: "fit-content" }),
              $maxWidth:
                size === "sm" ? "480px" : size === "md" ? "688px" : "1356px",
              $maxHeight: "860px",
            })}
        $backgroundColor={theme.card.background}
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
