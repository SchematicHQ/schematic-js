import { forwardRef } from "react";

import { Loader } from "../../ui";
import * as styles from "./styles";

export type ButtonStyleTypes = "blue" | "white" | "red" | "black";
export type ButtonSizeTypes = "sm" | "md" | "lg";
export type ButtonVariantTypes = "solid" | "outline" | "ghost" | "link";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  size?: ButtonSizeTypes;
  color?: ButtonStyleTypes;
  variant?: ButtonVariantTypes;
  isLoading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      disabled = false,
      size = "md",
      color = "white",
      variant = "solid",
      isLoading = false,
      ...props
    },
    ref,
  ) => {
    return (
      <styles.Button
        ref={ref}
        disabled={disabled}
        $size={size}
        $color={color}
        $variant={variant}
        {...props}
      >
        <Loader $size="sm" $isLoading={isLoading} />
        {children}
      </styles.Button>
    );
  },
);

Button.displayName = "Button";
