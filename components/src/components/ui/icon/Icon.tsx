import {
  iconsList,
  type IconNames,
  type IconProps as SchematicIconProps,
} from "@schematichq/schematic-icons";

import * as styles from "./styles";

export { iconsList, type IconNames };

const iconNames = new Set(Object.keys(iconsList));
export const isIconName = (value: string): value is IconNames =>
  iconNames.has(value);

export type IconProps = Omit<SchematicIconProps, "name"> & {
  name: IconNames | string;
};

export const Icon = ({ name, ...rest }: IconProps) => {
  if (isIconName(name)) {
    return <styles.Icon name={name} {...rest} />;
  }

  return (
    <span
      style={{
        fontSize: "1rem",
      }}
    >
      {name}
    </span>
  );
};
