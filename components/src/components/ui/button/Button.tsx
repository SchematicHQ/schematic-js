import { Loader } from "../loader";
import * as styles from "./styles";

export type ButtonStyleTypes = "blue" | "white" | "red" | "black";
export type ButtonSizeTypes = "sm" | "md" | "lg";
export type ButtonVariantTypes = "solid" | "outline" | "ghost" | "link";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonStyleTypes;
  size?: ButtonSizeTypes;
  variant?: ButtonVariantTypes;
  isLoading?: boolean;
}

export const Button = ({
  color = "white",
  size = "md",
  variant = "solid",
  disabled = false,
  isLoading = false,
  children,
  ...props
}: ButtonProps) => {
  return (
    <styles.Button
      $color={color}
      $size={size}
      $variant={variant}
      disabled={disabled}
      {...props}
    >
      <Loader $size="sm" $isLoading={isLoading} />
      {children}
    </styles.Button>
  );
};
