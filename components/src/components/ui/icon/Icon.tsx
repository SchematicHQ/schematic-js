// New file
import "schematic-icons/style.css";

import { Icon as IconComponent, IconNames, IconProps } from "schematic-icons";

import * as styles from "./styles";

export type IconNameTypes = IconNames;

export const Icon = ({ name, style, className, ...props }: IconProps) => {
  console.log("Styles", style);
  return (
    <styles.Icon name={name}>
      <IconComponent name={name} className={className} {...props} />
    </styles.Icon>
  );
};
