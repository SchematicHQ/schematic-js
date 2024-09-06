import cx from "classnames";
import icons from "../../../assets/icons/icons.js";
import { Icon as StyledIcon } from "./styles";

import "../../../assets/icons/icons.css";

export type IconNameTypes = keyof typeof icons;

export interface IconProps extends React.HTMLAttributes<HTMLElement> {
  name: IconNameTypes;
}

export const Icon = ({ name, className, ...props }: IconProps) => {
  return <StyledIcon className={cx("i", `i-${name}`, className)} {...props} />;
};
