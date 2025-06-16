// New file
// import "schematic-icons/style.css";

import { IconNames, IconProps } from "@schematichq/schematic-icons";

import * as styles from "./styles";

export type IconNameTypes = IconNames;

export const Icon = ({ name, style, className, ...props }: IconProps) => {
  return <styles.Icon name={name} className={className} {...props} />;
};
