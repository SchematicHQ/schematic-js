import { IconNames, iconsList } from "schematic-icons";

import { Icon } from "./Icon";
import { IconContainer } from "./styles";

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
  const iconNamesSet = new Set<IconNames>(
    Object.keys(iconsList) as IconNames[],
  );

  const isIconName = (value: string): value is IconNames => {
    return iconNamesSet.has(value as IconNames);
  };
  return (
    <IconContainer $size={size} $variant={variant} $colors={colors} {...props}>
      {isIconName(name) ? (
        <Icon name={name} />
      ) : (
        <span
          style={{
            fontSize: "1rem",
          }}
        >
          {name}
        </span>
      )}
    </IconContainer>
  );
};
