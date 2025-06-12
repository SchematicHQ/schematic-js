// New file
// import "schematic-icons/style.css";

import { Icon as IconComponent, IconNames, IconProps } from "schematic-icons";

import * as styles from "./styles";

export type IconNameTypes = IconNames;

export const Icon = ({ name, style, className, ...props }: IconProps) => {
  return (
    <styles.Icon name={name}>
      <IconComponent name={name} className={className} {...props} />
    </styles.Icon>
  );
};
