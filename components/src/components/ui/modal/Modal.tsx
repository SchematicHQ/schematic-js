import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useRef,
} from "react";

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

    useLayoutEffect(() => {
      if (innerRef.current?.parentElement !== document.body) {
        return;
      }

      const initialOverflowValue = document.body.style.overflow;

      if (innerRef.current.open) {
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.body.style.overflow = initialOverflowValue;
      };
    }, []);

    return (
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
    );
  },
);

Modal.displayName = "Modal";
