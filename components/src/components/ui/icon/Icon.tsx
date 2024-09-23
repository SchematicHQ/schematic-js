import cx from "classnames";
import icons from "./icons.js";
import { Icon as StyledIcon } from "./styles";

export type IconNameTypes = keyof typeof icons;

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  name: IconNameTypes;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
  return <StyledIcon className={cx("i", `i-${name}`, className)} {...props} />;
};
