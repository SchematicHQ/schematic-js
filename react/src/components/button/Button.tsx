import * as styles from "./styles";

export type ButtonStyleTypes = "blue" | "white" | "red" | "black";
export type ButtonSizeTypes = "sm" | "md" | "lg";

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  color?: ButtonStyleTypes;
  size?: ButtonSizeTypes;
}

export const Button = ({
  color = "white",
  size = "md",
  disabled = false,
  children,
  ...props
}: ButtonProps) => {
  return (
    <styles.Button size={size} color={color} disabled={disabled} {...props}>
      {children}
    </styles.Button>
  );
};
