import { Icon, IconNameTypes } from "./Icon";
import iconsList from "./icons.js";
import { Container } from "./styles";

export interface IconRoundProps extends React.HTMLAttributes<HTMLElement> {
  name: IconNameTypes;
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
  const iconNamesSet = new Set<IconNameTypes>(
    Object.keys(iconsList) as IconNameTypes[],
  );

  const isIconName = (value: string): value is IconNameTypes => {
    return iconNamesSet.has(value as IconNameTypes);
  };
  return (
    <Container $size={size} $variant={variant} $colors={colors} {...props}>
      {isIconName(name) ? <Icon name={name} /> : name}
    </Container>
  );
};
