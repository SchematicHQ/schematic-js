import { forwardRef } from "react";

import { Container } from "../../layout";

import * as styles from "./styles";

export type ModalSize = "sm" | "md" | "lg" | "auto";

export interface ModalProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  size?: ModalSize;
  top?: number;
}

export const Modal = forwardRef<HTMLDialogElement | null, ModalProps>(
  ({ children, size = "auto", top = 0, open, onClose, ...rest }, ref) => {
    return (
      <Container>
        <styles.Modal
          ref={ref}
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
