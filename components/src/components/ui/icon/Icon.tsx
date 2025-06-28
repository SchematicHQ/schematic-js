import {
  iconsList,
  type IconNames,
  type IconProps as SchematicIconProps,
} from "@schematichq/schematic-icons";

import * as styles from "./styles";

export { iconsList, type IconNames };

const iconNames = new Set(Object.keys(iconsList));
const isIconName = (value: string): value is IconNames => iconNames.has(value);
const getNameProps = (name: string) =>
  isIconName(name) ? { name } : { as: "span", children: name };

export interface IconProps extends Omit<SchematicIconProps, "name"> {
  name: IconNames | string; // allow for emoji unicode characters
  variant?: "filled" | "outline";
  size?: "tn" | "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
  color?: string;
  background?: string;
  rounded?: boolean;
}

export const Icon = ({
  children,
  name,
  variant,
  size,
  color = "white",
  background,
  rounded,
  ...rest
}: IconProps) => {
  return (
    <styles.Icon
      $variant={variant}
      $size={size}
      $color={color}
      $background={background}
      $rounded={rounded}
      {...getNameProps(name)}
      {...rest}
    />
  );
};
