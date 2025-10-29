import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Container } from "../../layout";

import * as styles from "./styles";

export type ModalSize = "sm" | "md" | "lg" | "auto";

interface ModalProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  size?: ModalSize;
  top?: number;
  onClose?: () => void;
}

export const Modal = forwardRef<HTMLDivElement | null, ModalProps>(
  ({ children, size = "auto", top = 0, onClose, ...rest }, outerRef) => {
    const innerRef = useRef<HTMLDivElement>(null);

    useImperativeHandle(outerRef, () => innerRef.current!, []);

    const { setLayout } = useEmbed();

    const isLightBackground = useIsLightBackground();

    const handleClose = useCallback(() => {
      setLayout("portal");
      onClose?.();
    }, [setLayout, onClose]);

    useLayoutEffect(() => {
      innerRef.current?.focus({ preventScroll: true });
    }, []);

    return (
      <Container>
        <styles.Overlay
          $marginTop={`${top}px`}
          $backgroundColor={
            isLightBackground
              ? "hsla(0, 0%, 87.5%, 0.9)"
              : "hsla(0, 0%, 12.5%, 0.9)"
          }
          $scrollbarColor={`${isLightBackground ? "hsla(0, 0%, 0%, 0.15)" : "hsla(0, 0%, 100%, 0.15)"} transparent`}
          {...rest}
        >
          <styles.Modal
            ref={innerRef}
            onKeyDown={(event) => {
              if (event.key === "Escape") {
                handleClose();
              }
            }}
            $size={size}
          >
            {children}
          </styles.Modal>
        </styles.Overlay>
      </Container>
    );
  },
);

Modal.displayName = "Modal";
