import {
  forwardRef,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
} from "react";

import * as styles from "./styles";

export type DialogSize = "sm" | "md" | "lg" | "auto";

export interface DialogProps extends React.DialogHTMLAttributes<HTMLDialogElement> {
  isModal?: boolean;
  size?: DialogSize;
  top?: number;
}

export const Dialog = forwardRef<HTMLDialogElement | null, DialogProps>(
  (
    {
      children,
      isModal = true,
      size = "auto",
      top = 0,
      open,
      onClose,
      ...rest
    },
    outerRef,
  ) => {
    const innerRef = useRef<HTMLDialogElement>(null);
    useImperativeHandle(outerRef, () => innerRef.current!, []);

    useLayoutEffect(() => {
      if (!isModal) {
        return;
      }

      const initialOverflowValue = document.body.style.overflow;

      if (innerRef.current?.open) {
        document.body.style.overflow = "hidden";
      }

      return () => {
        document.body.style.overflow = initialOverflowValue;
      };
    }, [isModal]);

    const dialog = useMemo(
      () => (
        <styles.Dialog
          ref={innerRef}
          open={open}
          onClose={onClose}
          $size={size}
          $top={top}
          {...rest}
        >
          {children}
        </styles.Dialog>
      ),
      [children, open, onClose, rest, size, top],
    );

    if (isModal) {
      return dialog;
    }

    return <styles.Overlay>{dialog}</styles.Overlay>;
  },
);

Dialog.displayName = "Dialog";
