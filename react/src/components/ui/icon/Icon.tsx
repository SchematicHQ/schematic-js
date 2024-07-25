import cx from "classnames";
import icons from "../../../assets/icons/icons.js";

export type IconNameTypes = keyof typeof icons;

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  name: IconNameTypes;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
  return <i className={cx("i", `i-${name}`, className)} {...props} />;
};
