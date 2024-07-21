import * as styles from "./styles";

export type ButtonStyleTypes = "blue" | "white" | "red" | "black";
export type ButtonSizeTypes = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonStyleTypes;
  size?: ButtonSizeTypes;
  variant?: "fill" | "outline";
}

export const Button = ({
  color = "black",
  size = "md",
  variant = "fill",
  disabled = false,
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
      {children}
    </styles.Button>
  );
};
