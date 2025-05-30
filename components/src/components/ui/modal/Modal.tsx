import { useCallback, useLayoutEffect, useRef } from "react";

import { useEmbed, useIsLightBackground } from "../../../hooks";
import { Container } from "../../layout";

import * as styles from "./styles";

export type ModalSize = "sm" | "md" | "lg" | "auto";

interface ModalProps extends React.HTMLAttributes<HTMLElement> {
  children: React.ReactNode;
  contentRef?: React.RefObject<HTMLDivElement | null>;
  size?: ModalSize;
  top?: number;
  onClose?: () => void;
}

export const Modal = ({
  children,
  contentRef,
  size = "auto",
  top = 0,
  onClose,
  ...rest
}: ModalProps) => {
  const { setLayout } = useEmbed();

  const isLightBackground = useIsLightBackground();

  const ref = useRef<HTMLDivElement | null>(null);

  const handleClose = useCallback(() => {
    ref.current?.classList.add("closing");
  }, []);

  const handleTransitionEnd: React.TransitionEventHandler<HTMLDivElement> =
    useCallback(
      (event) => {
        if (
          ref.current?.classList.contains("closing") &&
          event.propertyName === "transform"
        ) {
          setLayout("portal");
          onClose?.();
        }
      },
      [ref, setLayout, onClose],
    );

  useLayoutEffect(() => {
    contentRef?.current?.focus({ preventScroll: true });
  }, [contentRef]);

  return (
    <Container>
      <styles.Overlay
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
          ref={contentRef}
          onTransitionEnd={handleTransitionEnd}
          $size={size}
        >
          {children}
        </styles.Modal>
      </styles.Overlay>
    </Container>
  );
};

Modal.displayName = "Modal";
