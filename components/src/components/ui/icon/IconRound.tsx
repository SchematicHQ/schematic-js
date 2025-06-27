import { Icon, type IconNames } from "./Icon";
import * as styles from "./styles";

export interface IconRoundProps extends React.HTMLAttributes<HTMLElement> {
  name: IconNames | string;
  variant?: "outline" | "filled";
  size?: "tn" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  colors?: [string, string];
}

export const IconRound = ({
  name,
  variant = "filled",
  size = "md",
  colors = ["white", "#e5e7eb"],
  ...props
}: IconRoundProps) => {
  return (
    <styles.Container
      $size={size}
      $variant={variant}
      $colors={colors}
      {...props}
    >
      <Icon name={name} />
    </styles.Container>
  );
};
