import { useCallback, useEffect, useRef } from "react";
import { useTheme } from "styled-components";
import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Container, ModalInnerWrapper } from "./styles";

export type ModalSizeProps = "sm" | "md" | "lg" | "auto";

interface ModalProps {
  children: React.ReactNode;
  size?: ModalSizeProps;
  onClose?: () => void;
}

export const Modal = ({ children, size = "auto", onClose }: ModalProps) => {
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
      $backgroundColor={
        isLightBackground ? "hsla(0, 0%, 85%, 0.8)" : "hsla(0, 0%, 0%, 0.8)"
      }
      $overflow="hidden"
      $scrollbarColor={`${isLightBackground ? "hsla(0, 0%, 0%, 0.15)" : "hsla(0, 0%, 100%, 0.15)"} transparent`}
      $scrollbarWidth="thin"
      $scrollbarGutter="stable both-edges"
    >
      <ModalInnerWrapper
        id="select-plan-dialog"
        role="dialog"
        aria-labelledby="select-plan-dialog-label"
        aria-modal="true"
        size={size}
        theme={theme}
      >
        {children}
      </ModalInnerWrapper>
    </Container>
  );
};
