import { forwardRef, useCallback, useLayoutEffect } from "react";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Container } from "../../layout";
import { Box } from "../../ui";
import * as styles from "./styles";

export type ModalSize = "sm" | "md" | "lg" | "auto";

interface ModalProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  size?: ModalSize;
  top?: number;
  onClose?: () => void;
}

export const Modal = forwardRef<HTMLDivElement, ModalProps>(
  ({ children, contentRef, size = "auto", top = 0, onClose, ...rest }, ref) => {
    const { setLayout } = useEmbed();

    const isLightBackground = useIsLightBackground();

    const handleClose = useCallback(() => {
      setLayout("portal");
      onClose?.();
    }, [setLayout, onClose]);

    useLayoutEffect(() => {
      contentRef?.current?.focus({ preventScroll: true });
    }, [contentRef]);

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
        {...rest}
        $position="absolute"
        $top="50%"
        $left="50%"
        $zIndex="999999"
        $transform="translate(-50%, -50%)"
        $width="100%"
        $height="100%"
        $marginTop={`${top}px`}
        $backgroundColor={
          isLightBackground
            ? "hsla(0, 0%, 87.5%, 0.9)"
            : "hsla(0, 0%, 12.5%, 0.9)"
        }
        $overflow="hidden"
        $scrollbarColor={`${isLightBackground ? "hsla(0, 0%, 0%, 0.15)" : "hsla(0, 0%, 100%, 0.15)"} transparent`}
        $scrollbarWidth="thin"
        $scrollbarGutter="stable both-edges"
      >
        <Container>
          <styles.Modal ref={contentRef} $size={size}>
            {children}
          </styles.Modal>
        </Container>
      </Box>
    );
  },
);

Modal.displayName = "Modal";
