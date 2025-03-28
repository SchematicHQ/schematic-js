// New file
import "schematic-icons/style.css";

import { Icon as IconComponent, IconProps, iconsList } from "schematic-icons";

export type IconNameTypes = keyof typeof iconsList;

export const Icon = ({ name, style, className, ...props }: IconProps) => {
  console.log("Styles", style);
  return (
    <IconComponent name={name} style={style} className={className} {...props} />
  );
};
