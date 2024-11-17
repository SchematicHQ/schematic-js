import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "styled-components";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Flex } from "../../ui";
import { Container } from "./styles";

interface ModalProps {
  children: React.ReactNode;
  size?: "sm" | "md" | "lg" | "auto";
  top?: number;
  onClose?: () => void;
}

export const Modal = ({
  children,
  size = "auto",
  top = 0,
  onClose,
}: ModalProps) => {
  const theme = useTheme();
  const { setLayout } = useEmbed();

  const ref = useRef<HTMLDivElement>(null);

  const isLightBackground = useIsLightBackground();

  const handleClose = useCallback(() => {
    setLayout("portal");
    onClose?.();
  }, [setLayout, onClose]);

  useEffect(() => {
    ref.current?.focus();
  }, []);

  return (
    <Container
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
      $marginTop={`${top}px`}
      $backgroundColor={
        isLightBackground ? "hsla(0, 0%, 85%, 0.8)" : "hsla(0, 0%, 0%, 0.8)"
      }
      $overflow="hidden"
      $scrollbarColor={`${isLightBackground ? "hsla(0, 0%, 0%, 0.15)" : "hsla(0, 0%, 100%, 0.15)"} transparent`}
      $scrollbarWidth="thin"
      $scrollbarGutter="stable both-edges"
      $viewport={{
        sm: {
          $gap: "0.16rem",
        },
      }}
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
        $viewport={{
          sm: {
            $overflowY: "auto",
          },
        }}
      >
        {children}
      </Flex>
    </Container>
  );
};
