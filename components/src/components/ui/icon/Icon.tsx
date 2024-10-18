import cx from "classnames";
import icons from "./icons.js";
import * as styles from "./styles";

export type IconNameTypes = keyof typeof icons;

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  name: IconNameTypes;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
  return <styles.Icon className={cx("i", `i-${name}`, className)} {...props} />;
};
