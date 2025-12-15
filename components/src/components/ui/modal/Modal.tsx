import { forwardRef, useImperativeHandle, useRef } from "react";

import { Container } from "../../layout";

import * as styles from "./styles";

export type ModalSize = "sm" | "md" | "lg" | "auto";

export interface ModalProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  size?: ModalSize;
  top?: number;
}

export const Modal = forwardRef<HTMLDialogElement | null, ModalProps>(
  ({ children, size = "auto", top = 0, open, onClose, ...rest }, outerRef) => {
    const innerRef = useRef<HTMLDialogElement>(null);

    useImperativeHandle(outerRef, () => innerRef.current!, []);

    return (
      <Container>
        <styles.Modal
          ref={innerRef}
          open={open}
          onClose={onClose}
          $size={size}
          $top={top}
          {...rest}
        >
          {children}
        </styles.Modal>
      </Container>
    );
  },
);

Modal.displayName = "Modal";
