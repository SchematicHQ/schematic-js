import { Icon, IconNameTypes } from "./Icon";
import { Container } from "./styles";

export interface IconRoundProps extends React.HTMLAttributes<HTMLElement> {
  name: IconNameTypes;
  variant?: "outline" | "filled";
  size?: "tn" | "sm" | "md" | "lg";
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
    <Container $size={size} $variant={variant} $colors={colors} {...props}>
      <Icon name={name} />
    </Container>
  );
};
