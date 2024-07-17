import icons from "../../assets/icons/icons.js";

export type IconNameTypes = keyof typeof icons;

export interface IconProps {
  name: IconNameTypes;
  className?: string;
}

export const Icon = ({ name, className }: IconProps) => {
  return <i className={`i i-${name} ${className}`} />;
};
